# Copyright 2023 Google LLC
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
"""Endpoints for sustainability explorer."""

import dataclasses

import flask
from flask import Blueprint
from flask import current_app
from flask import redirect
from flask import url_for
from google.protobuf.json_format import MessageToJson

from server.cache import cache
import server.lib.subject_page_config as lib_subject_page_config
import server.lib.util

DEFAULT_CONTAINED_PLACE_TYPES = {
    "Continent": "Country",
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "AdministrativeArea3",
}

# Define blueprint
bp = Blueprint("sustainability", __name__, url_prefix='/sustainability')


@bp.route('/')
@bp.route('/<path:place_dcid>', strict_slashes=False)
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def sustainability_explorer(place_dcid=None):
  if not place_dcid:
    return redirect(url_for(
        'sustainability.sustainability_explorer',
        place_dcid=lib_subject_page_config.DEFAULT_PLACE_DCID),
                    code=302)

  subject_config = current_app.config['DISASTER_SUSTAINABILITY_CONFIG']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    # TODO: Delete this when we are close to launch
    subject_config = server.lib.util.get_disaster_sustainability_config()

  if not subject_config:
    return "Error: no config installed"

  # Update contained places from place metadata
  place_metadata = lib_subject_page_config.place_metadata(place_dcid)
  subject_config.metadata.contained_place_types.clear()
  subject_config.metadata.contained_place_types.update(
      place_metadata.contained_place_types)

  contained_place_type = place_metadata.contained_place_types.get(
      place_metadata.place_type, None)
  subject_config = lib_subject_page_config.remove_empty_charts(
      subject_config, place_dcid, contained_place_type)

  return flask.render_template(
      'custom_dc/stanford/sustainability.html',
      place_metadata=dataclasses.asdict(place_metadata),
      config=MessageToJson(subject_config),
      maps_api_key=current_app.config['MAPS_API_KEY'])
