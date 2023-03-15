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
import dataclasses
import json

import flask
from flask import Blueprint
from flask import current_app
from flask import redirect
from flask import url_for
from google.protobuf.json_format import MessageToJson

import server.lib.subject_page_config as lib_subject_page_config
import server.lib.util
import server.routes.api.place as place_api

EARTH_FIRE_SEVERITY_MIN = 500
FIRE_EVENT_TYPE_SPEC = "fire"

# Define blueprint
bp = Blueprint("disasters", __name__, url_prefix='/disasters')


@bp.route('/')
@bp.route('/<path:place_dcid>', strict_slashes=False)
def disaster_dashboard(place_dcid=None):
  if not place_dcid:
    return redirect(url_for(
        'disasters.disaster_dashboard',
        place_dcid=lib_subject_page_config.DEFAULT_PLACE_DCID),
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
  if place_metadata.contained_place_types_override:
    dashboard_config.metadata.contained_place_types.clear()
    dashboard_config.metadata.contained_place_types.update(
        place_metadata.contained_place_types_override)

  # TODO: move this to the place_metadata helper
  child_places = place_api.child_fetch(place_dcid)
  for place_type in child_places:
    child_places[place_type].sort(key=lambda x: x['pop'], reverse=True)
    child_places[place_type] = child_places[place_type][:place_api.
                                                        CHILD_PLACE_LIMIT]

  dashboard_config = lib_subject_page_config.remove_empty_charts(
      dashboard_config, place_dcid)

  return flask.render_template(
      'custom_dc/stanford/disaster_dashboard.html',
      place_type=json.dumps(place_metadata.place_types),
      place_name=place_metadata.place_name,
      place_dcid=place_dcid,
      config=MessageToJson(dashboard_config),
      parent_places=json.dumps(place_metadata.parent_places),
      child_places=json.dumps(child_places))
