# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Place Explorer related handlers."""

import json
import logging
import os
import re
import time
from typing import List, Set

import flask
from flask import current_app
from flask import g
from flask_babel import gettext
from werkzeug.datastructures import MultiDict

from server.lib.cache import cache
from server.lib.config import GLOBAL_CONFIG_BUCKET
from server.lib.feature_flags import is_feature_enabled
from server.lib.feature_flags import PLACE_PAGE_EXPERIMENT_FEATURE_FLAG
from server.lib.feature_flags import PLACE_PAGE_GA_FEATURE_FLAG
from server.lib.i18n import AVAILABLE_LANGUAGES
from server.lib.i18n import DEFAULT_LOCALE
from server.lib.i18n_messages import get_place_type_in_parent_places_str
import server.routes.dev_place.utils as utils
import server.routes.shared_api.place as place_api
import shared.lib.gcs as gcs
from shared.lib.place_summaries import get_shard_filename_by_dcid
from shared.lib.place_summaries import get_shard_name

bp = flask.Blueprint('place', __name__, url_prefix='/place')

CATEGORIES = {
    "Economics",
    "Health",
    "Equity",
    "Crime",
    "Education",
    "Demographics",
    "Housing",
    "Environment",
    "Energy",
}

CATEGORY_REDIRECTS = {
    "Climate": "Environment",
}

# Main DC domain to use for canonical URLs
CANONICAL_DOMAIN = 'datacommons.org'

# Location of place summary jsons on GKE
PLACE_SUMMARY_DIR = "/datacommons/place-summary/"

# Parent place types to include in listing of containing places at top of page
# Keep sorted!
PARENT_PLACE_TYPES_TO_HIGHLIGHT = [
    'County',
    'AdministrativeArea2',
    'EurostatNUTS2',
    'State',
    'AdministrativeArea1',
    'EurostatNUTS1',
    'Country',
    'Continent',
]

# Location of manually written templates for SEO experimentation in GCS bucket
SEO_EXPERIMENT_HTML_GCS_DIR = "seo_experiments/active"

# Location of manually written templates for SEO experimentation on local disk
SEO_EXPERIMENT_HTML_LOCAL_DIR = "config/seo_experiments/html_templates/active/"

# Map DCID of SEO experiment places to their template filename
SEO_EXPERIMENT_DCID_TO_HTML = {"country/EGY": "Egypt.html"}


def get_seo_experiment_template(dcid: str, use_local_template=False) -> str:
  """Load page template for SEO experiments
  
  If a file cannot be found or read, will return empty string instead.

  Args:
    dcid: dcid of the place the page is about
    use_local_template: if True, will read from local config file instead of
                        GCS. Used in development for writing new templates.
  """
  experiment_template = ""
  try:
    filename = SEO_EXPERIMENT_DCID_TO_HTML[dcid]

    if use_local_template:
      # Load template from local path
      template_filepath = os.path.join(current_app.root_path,
                                       SEO_EXPERIMENT_HTML_LOCAL_DIR, filename)
      with open(template_filepath, 'r', errors='ignore') as f:
        experiment_template = f.read()

    else:
      # Load template from GCS
      gcs_filepath = gcs.make_path(
          GLOBAL_CONFIG_BUCKET,
          os.path.join(SEO_EXPERIMENT_HTML_GCS_DIR, filename))
      output = gcs.read_to_string(gcs_filepath)
      return output

  except Exception as e:
    logging.error(
        f"Encountered exception while attempting to load experiment place page template for {dcid}: {e}"
    )
  return experiment_template


def get_place_summaries(dcid: str) -> dict:
  """Load place summary content from disk containing summary for a given dcid"""
  # Get shard matching the given dcid
  shard_name = get_shard_name(dcid)
  if not shard_name:
    shard_name = 'others'
  # When deployed in GKE, the config is a config mounted as volume. Check this
  # first.
  filepath = os.path.join(PLACE_SUMMARY_DIR, shard_name, "place_summaries.json")
  logging.info(
      f"Attempting to load summaries from ConfigMap mounted at {filepath}")
  if os.path.isfile(filepath):
    logging.info(f"Loading summaries from {filepath}")
    with open(filepath) as f:
      return json.load(f)
  # If no mounted config file, use the config that is in the code base.
  filename = get_shard_filename_by_dcid(dcid)
  logging.info(
      f"ConfigMap not found. Loading summaries locally from config/summaries/{filename}"
  )
  local_path = os.path.join(current_app.root_path,
                            f'config/summaries/{filename}')
  with open(local_path) as f:
    return json.load(f)


def generate_link_headers(place_dcid: str, category: str,
                          current_locale: str) -> str:
  """Generate canonical and alternate link HTTP headers

  Search crawlers look for rel="canonical" link headers to determine which
  version of a page to crawl and rel="alternative" link headers to identify
  different localized versions of the same page.

  Args:
    place_dcid: DCID of the place the page is about
    category: category of the page
    current_locale: locale of the page

  Returns:
    String to pass as value for 'Link' HTTP header
  """
  link_headers = []
  for locale_code in AVAILABLE_LANGUAGES:
    canonical_args = {
        'place_dcid': place_dcid,
        'category': category if category in CATEGORIES else None,
        'hl': locale_code if locale_code != 'en' else None
    }
    localized_url = "https://" + CANONICAL_DOMAIN + flask.url_for(
        'place.place', **canonical_args)

    # Add localized url as a language alternate link to headers
    link_headers.append(
        f'<{localized_url}>; rel="alternate"; hreflang="{locale_code}"')

    if locale_code == 'en':
      # Set English as default if user is in unsupported locale
      link_headers.append(
          f'<{localized_url}>; rel="alternate"; hreflang="x-default"')

    if locale_code == current_locale:
      # Set the url of the current locale as the canonical
      link_headers.append(f'<{localized_url}>; rel="canonical"')
  return ', '.join(link_headers)


def is_canonical_domain(url: str) -> bool:
  """Check if a url is on the canonical domain

  Used to determine if the request's URL is on the main DC instance.
  Both HTTP and HTTPS urls are matched, and both canonical and staging URLs
  are matched.


  Args:
    url: url to check

  Returns:
    True if request is to the canonical domain, False otherwise
  """
  regex = r"https?://(?:staging.)?{}".format(CANONICAL_DOMAIN)
  return re.match(regex, url) is not None


def get_place_html_link(place_dcid: str, place_name: str) -> str:
  """Get <a href-place page url> tag linking to the place page for a place"""
  url = flask.url_for('place.place', place_dcid=place_dcid)
  return f'<a href="{url}">{place_name}</a>'


def get_place_type_with_parent_places_links(dcid: str) -> str:
  """Get '<place type> in <parent places>' with html links for a given DCID"""
  # Get place type in localized, human-readable format
  place_type = place_api.api_place_type(dcid)
  place_type_display_name = place_api.get_place_type_i18n_name(place_type)

  # Get parent places and their localized names
  all_parents = place_api.parent_places([dcid],
                                        include_admin_areas=True).get(dcid, [])
  parents_to_include = [
      parent for parent in all_parents
      if parent['type'] in PARENT_PLACE_TYPES_TO_HIGHLIGHT
  ]

  # Create a dictionary mapping parent types to their order in the highlight list
  type_order = {
      parent_type: i
      for i, parent_type in enumerate(PARENT_PLACE_TYPES_TO_HIGHLIGHT)
  }

  # Sort the parents_to_include list using the type_order dictionary
  parents_to_include.sort(key=lambda parent: type_order.get(parent['type']))

  parent_dcids = [parent['dcid'] for parent in parents_to_include]
  localized_names = place_api.get_i18n_name(parent_dcids)
  places_with_names = [
      parent for parent in parents_to_include
      if parent['dcid'] in localized_names.keys()
  ]
  # Generate <a href=place page url> tag for each parent place
  links = [
      get_place_html_link(place_dcid=parent['dcid'],
                          place_name=localized_names.get(parent['dcid']))
      if parent['type'] != 'Continent' else localized_names.get(parent['dcid'])
      for parent in places_with_names
  ]

  if links:
    return get_place_type_in_parent_places_str(place_type_display_name,
                                               ', '.join(links))
  return ''


def is_seo_experiment_enabled(place_dcid: str, category: str,
                              locale: str) -> bool:
  """Determine if SEO experiment should be enabled for the page
  
  Args:
    place_dcid: dcid of the place the page is about
    category: page category, e.g. "Economics", "Health". Use "" for an
              overview page.
    locale: which i18n language locale the page is in.
  """
  # Use SEO experiment templates on English overview pages for places in
  # the experiment group only.
  # Do not release experiment to prod while templates are still being written.
  # TODO(juliawu): Once all templates are ready, enable the experiment on
  #                staging and prod.
  if place_dcid in SEO_EXPERIMENT_DCID_TO_HTML.keys(
  ) and not category and locale == 'en' and os.environ.get('FLASK_ENV') in [
      'local', 'autopush', 'dev'
  ]:
    return True
  return False


# Dev place page experiment groups for countries, US states, and cities
# Calculated offline using instructions here:
# https://github.com/datacommonsorg/website/pull/4773
# https://github.com/datacommonsorg/website/pull/4781
DEV_PLACE_EXPERIMENT_COUNTRY_DCIDS: List[str] = [
    'country/ABW', 'country/AND', 'country/AUT', 'country/AZE', 'country/BEL',
    'country/BEN', 'country/BLM', 'country/BOL', 'country/BRA', 'country/BRB',
    'country/BWA', 'country/CHL', 'country/COD', 'country/COG', 'country/CUW',
    'country/CZE', 'country/EGY', 'country/FJI', 'country/GGY', 'country/GIB',
    'country/GRC', 'country/GRL', 'country/HUN', 'country/IND', 'country/ISL',
    'country/JAM', 'country/KHM', 'country/LBN', 'country/LCA', 'country/LSO',
    'country/LVA', 'country/MDG', 'country/MDV', 'country/MLI', 'country/MSR',
    'country/MYT', 'country/NCL', 'country/NER', 'country/NFK', 'country/NGA',
    'country/NOR', 'country/PER', 'country/PNG', 'country/PRI', 'country/PRK',
    'country/PRY', 'country/PYF', 'country/RWA', 'country/SGP', 'country/SHN',
    'country/SPM', 'country/SSD', 'country/SUR', 'country/SVN', 'country/TCA',
    'country/TLS', 'country/TTO', 'country/VEN', 'country/WLF', 'country/YUG',
    'country/ZAF'
]
DEV_PLACE_EXPERIMENT_US_STATE_DCIDS: List[str] = [
    'geoId/01', 'geoId/04', 'geoId/09', 'geoId/10', 'geoId/20', 'geoId/22',
    'geoId/27', 'geoId/37', 'geoId/40', 'geoId/41', 'geoId/48', 'geoId/54',
    'geoId/56'
]
DEV_PLACE_EXPERIMENT_CITIES_DCIDS: List[str] = [
    'geoId/1714000', 'geoId/3651000', 'geoId/4865000', 'nuts/FR101',
    'nuts/PL127', 'wikidataId/Q1011138', 'wikidataId/Q1016939',
    'wikidataId/Q1022251', 'wikidataId/Q1025345', 'wikidataId/Q10393',
    'wikidataId/Q109949', 'wikidataId/Q112813', 'wikidataId/Q115256',
    'wikidataId/Q11725', 'wikidataId/Q11909', 'wikidataId/Q1207076',
    'wikidataId/Q125293', 'wikidataId/Q12829733', 'wikidataId/Q1337056',
    'wikidataId/Q1342853', 'wikidataId/Q134635', 'wikidataId/Q1357984',
    'wikidataId/Q1361', 'wikidataId/Q1375351', 'wikidataId/Q14634',
    'wikidataId/Q146723', 'wikidataId/Q147171', 'wikidataId/Q1489',
    'wikidataId/Q1530', 'wikidataId/Q1533', 'wikidataId/Q162880',
    'wikidataId/Q16959', 'wikidataId/Q170247', 'wikidataId/Q170322',
    'wikidataId/Q173985', 'wikidataId/Q174461', 'wikidataId/Q179608',
    'wikidataId/Q179691', 'wikidataId/Q183584', 'wikidataId/Q18459',
    'wikidataId/Q185684', 'wikidataId/Q18808', 'wikidataId/Q189633',
    'wikidataId/Q189823', 'wikidataId/Q1953', 'wikidataId/Q197922',
    'wikidataId/Q198184', 'wikidataId/Q198240', 'wikidataId/Q198266',
    'wikidataId/Q198370', 'wikidataId/Q200054', 'wikidataId/Q200235',
    'wikidataId/Q200663', 'wikidataId/Q200878', 'wikidataId/Q205922',
    'wikidataId/Q2060398', 'wikidataId/Q220', 'wikidataId/Q223761',
    'wikidataId/Q225641', 'wikidataId/Q243322', 'wikidataId/Q2449',
    'wikidataId/Q2471', 'wikidataId/Q25282', 'wikidataId/Q2640092',
    'wikidataId/Q26590', 'wikidataId/Q266014', 'wikidataId/Q269',
    'wikidataId/Q270787', 'wikidataId/Q2844', 'wikidataId/Q286266',
    'wikidataId/Q2868', 'wikidataId/Q2887', 'wikidataId/Q30340',
    'wikidataId/Q3141', 'wikidataId/Q324293', 'wikidataId/Q3274',
    'wikidataId/Q328615', 'wikidataId/Q332753', 'wikidataId/Q34820',
    'wikidataId/Q349973', 'wikidataId/Q35493', 'wikidataId/Q3579',
    'wikidataId/Q359990', 'wikidataId/Q360870', 'wikidataId/Q360942',
    'wikidataId/Q362865', 'wikidataId/Q36312', 'wikidataId/Q363479',
    'wikidataId/Q3640', 'wikidataId/Q36529', 'wikidataId/Q36947',
    'wikidataId/Q3711', 'wikidataId/Q3718', 'wikidataId/Q372791',
    'wikidataId/Q374365', 'wikidataId/Q3780', 'wikidataId/Q38545',
    'wikidataId/Q38927', 'wikidataId/Q3894', 'wikidataId/Q38968',
    'wikidataId/Q3921', 'wikidataId/Q404529', 'wikidataId/Q406',
    'wikidataId/Q416669', 'wikidataId/Q416988', 'wikidataId/Q426756',
    'wikidataId/Q42941', 'wikidataId/Q43463', 'wikidataId/Q4361',
    'wikidataId/Q44210', 'wikidataId/Q46747', 'wikidataId/Q4709',
    'wikidataId/Q48320', 'wikidataId/Q48338', 'wikidataId/Q486235',
    'wikidataId/Q486319', 'wikidataId/Q492552', 'wikidataId/Q496837',
    'wikidataId/Q4970', 'wikidataId/Q506578', 'wikidataId/Q515712',
    'wikidataId/Q570884', 'wikidataId/Q571033', 'wikidataId/Q571219',
    'wikidataId/Q571766', 'wikidataId/Q571949', 'wikidataId/Q572140',
    'wikidataId/Q57756', 'wikidataId/Q57787', 'wikidataId/Q57906',
    'wikidataId/Q57947', 'wikidataId/Q57958', 'wikidataId/Q5826',
    'wikidataId/Q58401', 'wikidataId/Q58576', 'wikidataId/Q58695',
    'wikidataId/Q59164', 'wikidataId/Q59227', 'wikidataId/Q59233',
    'wikidataId/Q612', 'wikidataId/Q616048', 'wikidataId/Q6487',
    'wikidataId/Q649', 'wikidataId/Q656', 'wikidataId/Q657072',
    'wikidataId/Q66485', 'wikidataId/Q66616', 'wikidataId/Q68744',
    'wikidataId/Q69060', 'wikidataId/Q699777', 'wikidataId/Q713317',
    'wikidataId/Q713357', 'wikidataId/Q71373', 'wikidataId/Q71455',
    'wikidataId/Q72945', 'wikidataId/Q75091', 'wikidataId/Q75110',
    'wikidataId/Q75379', 'wikidataId/Q8131', 'wikidataId/Q852238',
    'wikidataId/Q856003', 'wikidataId/Q862611', 'wikidataId/Q8660',
    'wikidataId/Q8673', 'wikidataId/Q883', 'wikidataId/Q887', 'wikidataId/Q894',
    'wikidataId/Q911', 'wikidataId/Q914', 'wikidataId/Q919',
    'wikidataId/Q93230', 'wikidataId/Q9361'
]
DEV_PLACE_EXPERIMENT_CONTINENT_DCIDS: List[str] = [
    'northamerica', 'southamerica', 'europe', 'africa', 'asia', 'antarctica',
    'oceania'
]
DEV_PLACE_EXPERIMENT_DCIDS: Set[str] = set(DEV_PLACE_EXPERIMENT_COUNTRY_DCIDS +
                                           DEV_PLACE_EXPERIMENT_US_STATE_DCIDS +
                                           DEV_PLACE_EXPERIMENT_CITIES_DCIDS +
                                           DEV_PLACE_EXPERIMENT_CONTINENT_DCIDS)


def is_dev_place_ga_enabled(request_args: MultiDict[str, str]) -> bool:
  """Determine if dev place ga should be enabled"""
  return is_feature_enabled(
      PLACE_PAGE_GA_FEATURE_FLAG
  ) and not request_args.get("disable_dev_places") == "true"


def is_dev_place_experiment_enabled(place_dcid: str, locale: str,
                                    request_args: MultiDict[str, str]) -> bool:
  """Determine if dev place experiment should be enabled for the page"""
  if not is_feature_enabled(PLACE_PAGE_EXPERIMENT_FEATURE_FLAG):
    return False

  # Force dev place experiment for testing
  if request_args.get("force_dev_places") == "true":
    return True
  # Disable dev place experiment for testing
  if request_args.get("disable_dev_places") == "true":
    return False

  # Experiment is enabled for English pages for countries and US states in the experiment group
  if locale == 'en' and place_dcid in DEV_PLACE_EXPERIMENT_DCIDS:
    return True
  return False


@bp.route('', strict_slashes=False)
@bp.route('/<path:place_dcid>')
@cache.cached(query_string=True)
def place(place_dcid=None):
  if is_dev_place_ga_enabled(
      flask.request.args) or is_dev_place_experiment_enabled(
          place_dcid, g.locale, flask.request.args):
    return dev_place(place_dcid=place_dcid)
  redirect_args = dict(flask.request.args)

  # Strip trailing slashes from place dcids
  should_redirect = False
  if place_dcid and place_dcid.endswith('/'):
    place_dcid = place_dcid.rstrip('/')
    should_redirect = True

  # Rename legacy "topic" request argument to "category"
  if 'topic' in flask.request.args:
    redirect_args['category'] = flask.request.args.get('topic', '')
    del redirect_args['topic']
    should_redirect = True

  # Rename legacy category request arguments
  category = redirect_args.get('category', None)
  if category in CATEGORY_REDIRECTS:
    redirect_args['category'] = CATEGORY_REDIRECTS[category]
    should_redirect = True

  if should_redirect:
    redirect_args['place_dcid'] = place_dcid
    return flask.redirect(flask.url_for('place.place', **redirect_args),
                          code=301)

  dcid = flask.request.args.get('dcid', None)
  if dcid:
    # Traffic from "explore more" in Search. Forward along all parameters,
    # except for dcid, to the new URL format.
    redirect_args = dict(flask.request.args)
    redirect_args['place_dcid'] = dcid
    del redirect_args['dcid']
    redirect_args['category'] = category
    url = flask.url_for('place.place',
                        **redirect_args,
                        _external=True,
                        _scheme=current_app.config.get('SCHEME', 'https'))
    return flask.redirect(url)

  if not place_dcid:
    return place_landing()

  place_type = place_api.api_place_type(place_dcid)
  if not place_type:
    return place_landing(error_msg=f'Place "{place_dcid}" not found')

  place_type_with_parent_places_links = get_place_type_with_parent_places_links(
      place_dcid)
  place_names = place_api.get_i18n_name([place_dcid])
  if place_names and place_names.get(place_dcid):
    place_name = place_names[place_dcid]
  else:
    place_name = place_dcid

  # Default to English page if translation is not available
  locale = flask.request.args.get('hl')
  if locale not in AVAILABLE_LANGUAGES:
    locale = 'en'

  if category not in CATEGORIES:
    category = None

  is_overview = (not category) or (category == 'Overview')

  place_summary = {}
  if is_overview and os.environ.get('FLASK_ENV') in [
      'local', 'autopush', 'dev', 'staging', 'production'
  ] and locale == 'en':
    # Only show summary for Overview page in base DC.
    # Fetch summary text from mounted volume
    start_time = time.time()
    place_summary = get_place_summaries(place_dcid).get(place_dcid, {})
    elapsed_time = (time.time() - start_time) * 1000
    logging.info(f"Place page summary took {elapsed_time:.2f} milliseconds.")

  # Block pages from being indexed if not on the main DC domain. This prevents
  # crawlers from indexing dev or custom DC versions of the place pages.
  block_indexing = not is_canonical_domain(flask.request.base_url)

  # Render SEO experimental pages
  if is_seo_experiment_enabled(place_dcid, category, locale):
    experiment_template = ""
    try:
      # Allow "useLocalTemplate=true" in the request to render template from
      # local config instead of GCS
      use_local_template = flask.request.args.get('useLocalTemplate')
      # Fetch template from GCS and log the timing
      start_time = time.time()
      experiment_template = get_seo_experiment_template(place_dcid,
                                                        use_local_template)
      elapsed_time = (time.time() - start_time) * 1000
      logging.info(
          f"Loading experiment place page template for {place_name} (DCID: {place_dcid}) took {elapsed_time:.2f} milliseconds."
      )
      # Load response
      response = flask.make_response(
          flask.render_template_string(
              experiment_template,
              place_type=place_type,
              place_name=place_name,
              place_dcid=place_dcid,
              place_type_with_parent_places_links=
              place_type_with_parent_places_links,
              category=category if category else '',
              place_summary=place_summary.get('summary')
              if place_summary and locale == 'en' else '',
              maps_api_key=current_app.config['MAPS_API_KEY'],
              block_indexing=block_indexing))
      response.headers.set('Link',
                           generate_link_headers(place_dcid, category, locale))
      return response
    except Exception as e:
      logging.error(
          f"Encountered exception while loading experiment place page template for {place_name} (DCID: {place_dcid}). Falling back to default place page template: {e}"
      )

  # Default to place.html template
  response = flask.make_response(
      flask.render_template(
          'place.html',
          place_type=place_type,
          place_name=place_name,
          place_dcid=place_dcid,
          place_type_with_parent_places_links=
          place_type_with_parent_places_links,
          category=category if category else '',
          place_summary=place_summary.get('summary') if place_summary else '',
          maps_api_key=current_app.config['MAPS_API_KEY'],
          block_indexing=block_indexing))
  response.headers.set('Link',
                       generate_link_headers(place_dcid, category, locale))
  return response


def place_landing(error_msg=''):
  """Returns filled template for the place landing page."""
  template_file = os.path.join('custom_dc', g.env, 'place_landing.html')
  dcid_json = os.path.join('custom_dc', g.env, 'place_landing_dcids.json')
  if not os.path.exists(
      os.path.join(current_app.root_path, 'templates', template_file)):
    template_file = 'place_landing.html'
    dcid_json = 'place_landing_dcids.json'

  with open(os.path.join(current_app.root_path, 'templates', dcid_json)) as f:
    landing_dcids = json.load(f)
    # Use display names (including state, if applicable) for the static page
    place_names = place_api.get_display_name(landing_dcids)
    return flask.render_template(
        template_file,
        error_msg=error_msg,
        place_names=place_names,
        maps_api_key=current_app.config['MAPS_API_KEY'])


# Dev place experiment route
def dev_place(place_dcid=None):
  place_names = place_api.get_i18n_name([place_dcid]) or {}
  place_name = place_names.get(place_dcid, place_dcid)
  # Place summaries are currently only supported in English
  if g.locale == DEFAULT_LOCALE:
    place_summary = get_place_summaries(place_dcid).get(place_dcid,
                                                        {}).get("summary", "")
  else:
    place_summary = ""

  return flask.render_template(
      'dev_place.html',
      maps_api_key=current_app.config['MAPS_API_KEY'],
      place_dcid=place_dcid,
      place_name=place_name,
      place_summary=place_summary)
