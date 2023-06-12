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
"""Endpoints for event pages"""

import copy
import json
import logging
from typing import Dict, List

from flask import Blueprint
from flask import current_app
from flask import render_template
from google.protobuf.json_format import MessageToJson
from markupsafe import escape

from server.cache import cache
from server.lib import fetch
import server.lib.shared as shared_api
import server.lib.subject_page_config as lib_subject_page_config
import server.lib.util as lib_util

DEFAULT_EVENT_DCID = ""

# Important: please keep order of keys from smallest to biggest place type.
DEFAULT_CONTAINED_PLACE_TYPES = {
    "AdministrativeArea2": "AdministrativeArea3",
    "AdministrativeArea1": "AdministrativeArea2",
    "Country": "AdministrativeArea1",
    "Continent": "Country",
}

EMPTY_SUBJECT_PAGE_ARGS = {
    "place_types": "[]",
    "place_name": "",
    "place_dcid": "",
    "parent_places": "[]",
    "subject_config": "{}",
}

LOCATION_PROPERTIES = ['location', 'startLocation']

# Define blueprint
bp = Blueprint("event", __name__, url_prefix='/event')


def get_property_value(dcid: str, prop: str) -> str:
  result = fetch.property_values([dcid], prop)
  if result[dcid]:
    return result[dcid][0]
  return None


def get_provenance(properties):
  """
  Returns full provenance display info for event.

  Args:
    properties: All properties of the event.

  Returns:
    A list of { url, sourceName } objects to display provenances.
  """
  ret = []

  provenance = properties.get('provenance', None)
  if not provenance:
    return ret

  for p in provenance:
    dcid = p.get('dcid', None)
    if not dcid:
      continue
    url = get_property_value(dcid, 'url')
    source = get_property_value(dcid, 'source')
    if source:
      source_name = get_property_value(source, 'name')
    if url and source_name:
      ret.append({"url": url, "sourceName": source_name})

  return ret


def get_places(properties) -> Dict[str, List[str]]:
  """
  Returns place hierarchy and types based on lat/long of event.

  Args:
    properties: All properties of the event.

  Returns:
    A dictionary of { place_dcid: [place_types] }, for all places in the
    hierarchy containing the lat/long of the event.
  """
  for prop, values in properties.items():
    if prop in LOCATION_PROPERTIES and len(values):
      dcid = values[0].get('dcid', None)
      if not dcid:
        continue
      latitude = get_property_value(dcid, 'latitude')
      longitude = get_property_value(dcid, 'longitude')
      if not latitude or not longitude:
        continue
      coordinates = [{
          'latitude': latitude,
          'longitude': longitude,
      }]
      place_coordinates = fetch.resolve_coordinates(coordinates)
      dcids_to_get_type = set()
      for _, place_dcids in place_coordinates.items():
        dcids_to_get_type.update(place_dcids)
      place_types = fetch.property_values(list(dcids_to_get_type), 'typeOf')
      return place_types


def find_best_place_for_config(places: Dict[str, List[str]]) -> str:
  """
    Returns a single place dcid to use for the subject page config (preferring
    the lowest granularity for topic).
    """
  for container in DEFAULT_CONTAINED_PLACE_TYPES.keys():
    for place_dcid, type_list in reversed(list(places.items())):
      if container in type_list:
        return place_dcid
  return None


@bp.route('/')
@bp.route('/<path:dcid>', strict_slashes=False)
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def event_node(dcid=DEFAULT_EVENT_DCID):
  # Get node properties
  node_name = escape(dcid)
  properties = {}
  try:
    name_results = shared_api.names([dcid])
    if dcid in name_results.keys():
      node_name = name_results.get(dcid)
    properties = fetch.triples([dcid]).get(dcid, {})
  except Exception as e:
    logging.info(e)

  provenance = get_provenance(properties)

  # Get subject page config for event.
  subject_config = current_app.config['DISASTER_EVENT_CONFIG']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    subject_config = lib_util.get_disaster_event_config()

  subject_config = copy.deepcopy(subject_config)
  places = get_places(properties)
  place_dcid = find_best_place_for_config(places)

  subject_page_args = EMPTY_SUBJECT_PAGE_ARGS
  if place_dcid:
    place_metadata = lib_subject_page_config.place_metadata(
        place_dcid, get_child_places=False)
    if not place_metadata.is_error:
      # Update contained places from place metadata
      subject_config.metadata.contained_place_types.clear()
      subject_config.metadata.contained_place_types.update(
          place_metadata.contained_place_types)
      contained_place_type = place_metadata.contained_place_types.get(
          place_metadata.place_type, None)

      # Post-processing on subject page config
      subject_config = lib_subject_page_config.remove_empty_charts(
          subject_config, place_dcid, contained_place_type)

      # TODO: If not enough charts from the current place, add from the next place up and so on.
      subject_page_args = {
          "place_types": [place_metadata.place_type],
          "place_name": place_metadata.place_name,
          "place_dcid": place_dcid,
          "parent_places": json.dumps(place_metadata.parent_places),
          "subject_config": MessageToJson(subject_config)
      }

  template_args = {
      "dcid": escape(dcid),
      "maps_api_key": current_app.config['MAPS_API_KEY'],
      "node_name": node_name,
      "properties": json.dumps(properties),
      "provenance": json.dumps(provenance),
  }
  template_args.update(subject_page_args)
  return render_template('event.html', **template_args)
