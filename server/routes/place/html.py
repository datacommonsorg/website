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
from urllib.parse import urlencode

import flask
from flask import current_app
from flask import g
from flask_babel import gettext
from werkzeug.datastructures import MultiDict

from server.lib.cache import cache
from server.lib.config import GLOBAL_CONFIG_BUCKET
from server.lib.feature_flags import is_feature_enabled
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

PROD_PLACE_PAGE_BASE_URL = 'https://datacommons.org/place/'

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


def is_dev_place_ga_enabled(request_args: MultiDict[str, str]) -> bool:
  """Determine if dev place ga should be enabled"""
  return is_feature_enabled(
      PLACE_PAGE_GA_FEATURE_FLAG
  ) and not request_args.get("disable_dev_places") == "true"


def legacy_place(place_dcid: str, category: str):
  """Render legacy place page"""
  place_type = place_api.api_place_type(place_dcid)

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
              sample_questions=json.dumps(
                  current_app.config.get('HOMEPAGE_SAMPLE_QUESTIONS', [])),
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
          sample_questions=json.dumps(
              current_app.config.get('HOMEPAGE_SAMPLE_QUESTIONS', [])),
          block_indexing=block_indexing))
  response.headers.set('Link',
                       generate_link_headers(place_dcid, category, locale))
  return response


def get_canonical_links(place_dcid: str, place_category: str) -> List[str]:
  """Returns canonical and alternate language header links for the place page

  Returns an empty list if the place category is invalid.

  Always sets the base url to "https://datacommons.org/place/" to avoid indexing
  dev or custom DC versions of the place pages.

  Args:
    place_dcid: The DCID of the place to get canonical links for
    place_category: The category of the place to get canonical links for

  Returns:
    A list of canonical and alternate language header links for the place page

  Example output:
  <link rel="canonical" href="https://datacommons.org/place/geoId/06?category=Health">
  <link rel="alternate" hreflang="x-default" href="https://datacommons.org/place/geoId/06?category=Health">
  <link rel="alternate" hreflang="de" href="https://datacommons.org/place/geoId/06?category=Health&hl=de">
  <link rel="alternate" hreflang="en" href="https://datacommons.org/place/geoId/06?category=Health">
  <link rel="alternate" hreflang="es" href="https://datacommons.org/place/geoId/06?category=Health&hl=es">
  <link rel="alternate" hreflang="fr" href="https://datacommons.org/place/geoId/06?category=Health&hl=fr">
  <link rel="alternate" hreflang="hi" href="https://datacommons.org/place/geoId/06?category=Health&hl=hi">
  <link rel="alternate" hreflang="it" href="https://datacommons.org/place/geoId/06?category=Health&hl=it">
  <link rel="alternate" hreflang="ja" href="https://datacommons.org/place/geoId/06?category=Health&hl=ja">
  <link rel="alternate" hreflang="ko" href="https://datacommons.org/place/geoId/06?category=Health&hl=ko">
  <link rel="alternate" hreflang="ru" href="https://datacommons.org/place/geoId/06?category=Health&hl=ru">
  """
  links = []
  # Return empty list if the place category is invalid
  if place_category and place_category not in CATEGORIES and place_category != 'Overview':
    return links

  # Add canonical URL without language parameter
  query_params = {}
  if place_category and place_category != 'Overview':
    query_params['category'] = place_category
  canonical_url = PROD_PLACE_PAGE_BASE_URL + place_dcid
  if query_params:
    canonical_url += '?' + urlencode(query_params)
  links.append(f'<link rel="canonical" href="{canonical_url}">')

  # Add x-default alternate link pointing to English version
  links.append(
      f'<link rel="alternate" hreflang="x-default" href="{canonical_url}">')

  # Add language-specific alternate links
  for lang in AVAILABLE_LANGUAGES:
    query_params = {}
    if place_category and place_category != 'Overview':
      query_params['category'] = place_category
    if lang != DEFAULT_LOCALE:
      query_params['hl'] = lang
    url = PROD_PLACE_PAGE_BASE_URL + place_dcid
    if query_params:
      url += '?' + urlencode(query_params)
    links.append(f'<link rel="alternate" hreflang="{lang}" href="{url}">')
  return links


def redirect_to_place_page(dcid: str, request_args: MultiDict[str, str]):
  """Redirect to the place page for the given DCID

  Handles redirects from Google Search using old URL format
  Args:
    dcid: The DCID of the place to redirect to
    request_args: The request arguments to forward to the place page
  Returns:
    A redirect to the place page
  """
  redirect_args = dict(request_args)
  redirect_args['place_dcid'] = dcid
  del redirect_args['dcid']
  url = flask.url_for('place.place',
                      **redirect_args,
                      _external=True,
                      _scheme=current_app.config.get('SCHEME', 'https'))
  return flask.redirect(url)


@bp.route('', strict_slashes=False)
@cache.cached(query_string=True)
def place_explorer():
  """Renders the place explorer landing page.

  Also handles redirects from Google Search to individual place pages if the
  request includes a dcid.
  """
  dcid = flask.request.args.get('dcid', None)

  # If the request contains a dcid, redirect to the place page.
  # This handles redirects from Google Search "Explore More" link.
  # Example URL:
  # https://datacommons.org/place?utm_medium=explore&dcid=geoId/06&mprop=count&popt=Person&hl=en
  if dcid:
    return redirect_to_place_page(dcid, flask.request.args)

  # Otherwise, render the place explorer landing page
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
        place_names=place_names,
        maps_api_key=current_app.config['MAPS_API_KEY'])


@bp.route('/<path:place_dcid>', strict_slashes=False)
@cache.cached(query_string=True)
def place(place_dcid):
  """
  Renders place page with the given DCID.

  Args:
    place_dcid: DCID of the place to redirect to
  """
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
  elif category is not None and category not in CATEGORIES:
    # Redirect to the overview page if the category is invalid
    redirect_args['category'] = None
    should_redirect = True

  if should_redirect:
    redirect_args['place_dcid'] = place_dcid
    return flask.redirect(flask.url_for('place.place', **redirect_args),
                          code=301)

  # Render legacy place page if dev place ga is not enabled
  if not is_dev_place_ga_enabled(flask.request.args):
    return legacy_place(place_dcid=place_dcid, category=category)

  place_names = place_api.get_i18n_name([place_dcid]) or {}
  place_name = place_names.get(place_dcid, place_dcid)
  # Place summaries are currently only supported in English
  if g.locale == DEFAULT_LOCALE:
    place_summary = get_place_summaries(place_dcid).get(place_dcid,
                                                        {}).get("summary", "")
  else:
    place_summary = ""

  canonical_links = get_canonical_links(place_dcid, category)
  return flask.render_template('dev_place.html',
                               canonical_links=canonical_links,
                               category=category,
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               place_dcid=place_dcid,
                               place_name=place_name,
                               place_summary=place_summary,
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))
