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
"""Development place explorer routes"""

import os

import flask
from flask import current_app
from flask import g

from server.lib.i18n import DEFAULT_LOCALE
import server.routes.dev_place.utils as utils
from server.routes.place.html import get_place_summaries
import server.routes.shared_api.place as place_api

bp = flask.Blueprint('dev_place', __name__, url_prefix='/dev-place')


# Temporary route to hold the new, revamped place page while in development
# TODO(juliawu): Move this to the default place route once development is done.
@bp.route('/<path:place_dcid>')
def dev_place(place_dcid=None):
  if os.environ.get('FLASK_ENV') not in [
      'local', 'autopush', 'dev', 'webdriver'
  ] or not place_dcid:
    flask.abort(404)

  place_type_with_parent_places_links = utils.get_place_type_with_parent_places_links(
      place_dcid)
  place_names = place_api.get_i18n_name([place_dcid]) or {}
  place_name = place_names.get(place_dcid, place_dcid)
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
      place_type_with_parent_places_links=place_type_with_parent_places_links,
      place_summary=place_summary)
