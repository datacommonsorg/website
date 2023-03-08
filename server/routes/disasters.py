# Copyright 2022 Google LLC
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
"""Endpoints for disaster dashboard"""

import copy
import json

import flask
from flask import Blueprint
from flask import current_app
from flask import redirect
from flask import url_for
from google.protobuf.json_format import MessageToJson

from server.config import subject_page_pb2
import server.lib.subject_page_config as lib_subject_page_config
import server.lib.util
import server.services.datacommons as dc

EUROPE_DCID = "europe"
EUROPE_CONTAINED_PLACE_TYPES = {
    "Country": "EurostatNUTS1",
    "EurostatNUTS1": "EurostatNUTS2",
    "EurostatNUTS2": "EurostatNUTS3",
    "EurostatNUTS3": "EurostatNUTS3",
}
EARTH_FIRE_SEVERITY_MIN = 500
FIRE_EVENT_TYPE_SPEC = "fire"

# Define blueprint
bp = Blueprint("disasters", __name__, url_prefix='/disasters')


@bp.route('/')
@bp.route('/<path:place_dcid>', strict_slashes=False)
def disaster_dashboard(place_dcid=None):
  if not place_dcid:
    return redirect(url_for('disasters.disaster_dashboard', place_dcid=lib_subject_page_config.DEFAULT_PLACE_DCID),
                    code=302)

  dashboard_config = current_app.config['DISASTER_DASHBOARD_CONFIG']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    # TODO: Delete this when we are close to launch
    dashboard_config = server.lib.util.get_disaster_dashboard_config()

  if not dashboard_config:
    return "Error: no config installed"

  # Override the min severity for fires for Earth
  # TODO: Do this by extending the config instead.
  if place_dcid == lib_subject_page_config.DEFAULT_PLACE_DCID:
    dashboard_config = copy.deepcopy(dashboard_config)
    for key in dashboard_config.metadata.event_type_spec:
      if key == FIRE_EVENT_TYPE_SPEC:
        spec = dashboard_config.metadata.event_type_spec[key]
        spec.default_severity_filter.lower_limit = EARTH_FIRE_SEVERITY_MIN

  place_metadata = lib_subject_page_config.place_metadata(place_dcid)
  # If this is a European place, update the contained_place_types in the page
  # metadata to use a custom dict instead.
  # TODO: Find a better way to handle this
  parent_dcids = map(lambda place: place.get("dcid", ""), place_metadata.parent_places)
  if EUROPE_DCID in parent_dcids:
    dashboard_config.metadata.contained_place_types.clear()
    dashboard_config.metadata.contained_place_types.update(
        EUROPE_CONTAINED_PLACE_TYPES)

  all_stat_vars = lib_subject_page_config.get_all_variables(dashboard_config)
  if all_stat_vars:
    stat_vars_existence = dc.observation_existence(all_stat_vars, [place_dcid])

    for stat_var in stat_vars_existence['variable']:
      if not stat_vars_existence['variable'][stat_var]['entity'][place_dcid]:
        # This is for the main place, only remove the tile type for single place.
        for tile_type in [
            subject_page_pb2.Tile.TileType.HISTOGRAM,
            subject_page_pb2.Tile.TileType.LINE,
            subject_page_pb2.Tile.TileType.BAR,
        ]:
          dashboard_config = lib_subject_page_config.trim_config(
              dashboard_config, stat_var, tile_type)

  return flask.render_template('custom_dc/stanford/disaster_dashboard.html',
                               place_type=json.dumps(place_metadata.place_types),
                               place_name=place_metadata.place_name,
                               place_dcid=place_dcid,
                               config=MessageToJson(dashboard_config),
                               parent_places=json.dumps(place_metadata.parent_places))
