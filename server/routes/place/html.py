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
import time

import flask
from flask import current_app
from flask import g

import server.routes.shared_api.place as place_api

bp = flask.Blueprint('place', __name__, url_prefix='/place')

CATEGORY_REDIRECTS = {
    "Climate": "Environment",
}

PLACE_SUMMARY_PATH = "/datacommons/place-summary/place_summaries.json"

# Main DC domain to set as canonical for indexing.
CANONICAL_ROOT = "https://datacommons.org"


def get_place_summaries() -> dict:
  """Load place summary content from disk"""
  # When deployed in GKE, the config is a config mounted as volume. Check this
  # first.
  if os.path.isfile(PLACE_SUMMARY_PATH):
    with open(PLACE_SUMMARY_PATH) as f:
      return json.load(f)
  # If no mounted config file, use the config that is in the code base.
  local_path = os.path.join(current_app.root_path,
                            'config/summaries/place_summaries.json')
  with open(local_path) as f:
    return json.load(f)


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

  place_summary = {}
  # Only show summary for Overview page in base DC.
  if not category and os.environ.get('FLASK_ENV') in [
      'local', 'autopush', 'dev', 'staging', 'production'
  ] and g.locale == "en":
    # Fetch summary text from mounted volume
    start_time = time.time()
    place_summary = get_place_summaries().get(place_dcid, {})
    elapsed_time = (time.time() - start_time) * 1000
    logging.info(f"Place page summary took {elapsed_time:.2f} milliseconds.")

  # Block pages from being indexed if not on the main DC domain. This prevents
  # crawlers from indexing dev or custom DC versions of the place pages.
  block_indexing = CANONICAL_ROOT not in flask.request.base_url
  logging.info(f"base_url is {flask.request.base_url}")

  return flask.render_template(
      'place.html',
      place_type=place_type,
      place_name=place_name,
      place_dcid=place_dcid,
      category=category if category else '',
      place_summary=place_summary.get("summary") if place_summary else '',
      maps_api_key=current_app.config['MAPS_API_KEY'],
      block_indexing=block_indexing)


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
