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
from server.lib.i18n import AVAILABLE_LANGUAGES
from server.lib.i18n import DEFAULT_LOCALE
from server.lib.i18n_messages import get_place_type_in_parent_places_str
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

  place_names = place_api.get_i18n_name([place_dcid]) or {}
  place_name = place_names.get(place_dcid, place_dcid)

  canonical_links = get_canonical_links(place_dcid, category)
  return flask.render_template('place.html',
                               canonical_links=canonical_links,
                               category=category,
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               place_dcid=place_dcid,
                               place_name=place_name,
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))
