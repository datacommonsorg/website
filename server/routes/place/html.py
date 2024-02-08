# Copyright 2020 Google LLC
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

import flask
from flask import current_app
from flask import g

from server.lib.i18n import AVAILABLE_LANGUAGES
import server.routes.shared_api.place as place_api
from tools.summaries.utils import get_shard_filename_by_dcid

bp = flask.Blueprint('place', __name__, url_prefix='/place')

CATEGORIES = [
    "Economics",
    "Health",
    "Equity",
    "Crime",
    "Education",
    "Demographics",
    "Housing",
    "Environment",
    "Energy",
]

CATEGORY_REDIRECTS = {
    "Climate": "Environment",
}

# Main DC domain to use for canonical URLs
CANONICAL_DOMAIN = 'datacommons.org'

# Location of place summary jsons on GKE
PLACE_SUMMARY_DIR = "/datacommons/place-summary/"


def get_place_summaries(dcid: str) -> dict:
  """Load place summary content from disk containing summary for a given dcid"""
  # When deployed in GKE, the config is a config mounted as volume. Check this
  # first.
  filename = get_shard_filename_by_dcid(dcid)
  filepath = os.path.join(PLACE_SUMMARY_DIR, filename)
  if os.path.isfile(filepath):
    with open(filepath) as f:
      return json.load(f)
  # If no mounted config file, use the config that is in the code base.
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


@bp.route('', strict_slashes=False)
@bp.route('/<path:place_dcid>')
def place(place_dcid=None):
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

  place_type = place_api.get_place_type(place_dcid)
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
    place_summary = get_place_summaries(place_dcid).get(
        place_dcid, {})
    elapsed_time = (time.time() - start_time) * 1000
    logging.info(f"Place page summary took {elapsed_time:.2f} milliseconds.")

  # Block pages from being indexed if not on the main DC domain. This prevents
  # crawlers from indexing dev or custom DC versions of the place pages.
  block_indexing = not is_canonical_domain(flask.request.base_url)
  logging.info(f"flask.requests.base_url is {flask.request.base_url}")
  logging.info(f"Block indexing on place pages? {block_indexing}")

  response = flask.make_response(
      flask.render_template(
          'place.html',
          place_type=place_type,
          place_name=place_name,
          place_dcid=place_dcid,
          category=category if category else '',
          place_summary=place_summary.get('summary') if place_summary else '',
          maps_api_key=current_app.config['MAPS_API_KEY'],
          block_indexing=block_indexing))
  response.headers.set('Link',
                       generate_link_headers(place_dcid, category, locale))

  return response


def place_landing():
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
        place_names=place_names,
        maps_api_key=current_app.config['MAPS_API_KEY'])
