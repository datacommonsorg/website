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

import flask
from flask import Blueprint
from flask import current_app
from flask import redirect
from flask import url_for
from google.protobuf.json_format import MessageToJson

import server.lib.subject_page_config as lib_subject_page_config
import server.lib.util

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

  # Update contained places from place metadata
  place_metadata = lib_subject_page_config.place_metadata(place_dcid)
  if place_metadata.is_error:
    return flask.render_template(
        'custom_dc/stanford/disaster_dashboard.html',
        place_metadata=place_metadata,
        config=None,
        maps_api_key=current_app.config['MAPS_API_KEY'])

  dashboard_config.metadata.contained_place_types.clear()
  dashboard_config.metadata.contained_place_types.update(
      place_metadata.contained_place_types)

  contained_place_type = place_metadata.contained_place_types.get(
      place_metadata.place_type, None)
  dashboard_config = lib_subject_page_config.remove_empty_charts(
      dashboard_config, place_dcid, contained_place_type)

  return flask.render_template(
      'custom_dc/stanford/disaster_dashboard.html',
      place_metadata=dataclasses.asdict(place_metadata),
      config=MessageToJson(dashboard_config),
      maps_api_key=current_app.config['MAPS_API_KEY'])
