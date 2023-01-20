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

from flask import Blueprint, request, current_app, Response
import services.datacommons as dc
import json
import logging

# Define blueprint
bp = Blueprint("disaster_api", __name__, url_prefix='/api/disaster-dashboard')

EARTH_DCID = "Earth"
EVENT_POINT_KEYS = set(
    ["affectedPlaces", "latitude", "longitude", "startDate", "eventId"])


@bp.route('/event-date-range')
def event_date_range():
  """Gets the date range of event data for a specific event type

  Returns: an object with minDate and maxDate
      {
          minDate: string,
          maxDate: string
      }
  """
  event_type = request.args.get('eventType', '')
  if not event_type:
    return "error: must provide a eventType field", 400
  place = request.args.get('place', '')
  if not place:
    return "error: must provide a place field", 400
  date_list = dc.get_event_collection_date(event_type,
                                           place).get('eventCollectionDate',
                                                      {}).get('dates', [])
  result = {'minDate': "", 'maxDate': ""}
  if len(date_list) > 0:
    result = {'minDate': date_list[0], 'maxDate': date_list[-1]}
  return Response(json.dumps(result), 200, mimetype='application/json')


def keep_event(event, place, filter_prop, filter_unit, filter_upper_limit,
               filter_lower_limit):
  """
  Returns whether or not we should keep an event
  """
  if place != EARTH_DCID and not place in event.get("affectedPlaces", []):
    # event does not affect the place of interest
    return False
  if not filter_prop or not filter_prop in event:
    # no props to filter by or event doesn't contain the prop information
    return True
  prop_val = event[filter_prop]
  if len(prop_val) < len(filter_unit):
    # value for the property to filter by is empty
    return True
  val_string = prop_val[len(filter_unit):].strip()
  try:
    val = float(val_string)
    return val <= filter_upper_limit and val >= filter_lower_limit
  except:
    # can't parse the value to filter by into a float
    logging.info(
        f'Could not parse filter value for event: {event["eventId"]}, filter prop: {filter_prop}'
    )
    return True


@bp.route('/json-event-data')
def json_event_data():
  """Gets the event data from saved jsons for a given eventType, date, place,
     andfilter information (filter prop, unit, lower limit, and upper limit).

  Returns: an object of the following form
    {
      eventCollection: {
        events: [
          {
            dcid: string,
            dates: list of strings,
            geoLocations: list of { point: { latitude: number, longitude: number } },
            places: list of strings,
            provenanceId: string,
            propVals: {
              [prop]: { vals: list of strings },
              ...
            }
          },
          ...
        ],
        provenanceInfo: {
          [provenanceId]: {
            domain: string,
            importName: string,
            provenanceUrl: string
          },
          ...
        }
      }
  """
  event_type = request.args.get('eventType', '')
  if not event_type:
    return "error: must provide a eventType field", 400
  date = request.args.get('date', '')
  if not date:
    return "error: must provide a date field", 400
  place = request.args.get('place', '')
  if not place:
    return "error: must provide a place field", 400
  filter_prop = request.args.get('filterProp', '')
  filter_unit = request.args.get('filterUnit', '')
  filter_upper_limit = float(request.args.get('filterUpperLimit', '0'))
  filter_lower_limit = float(request.args.get('filterLowerLimit', '0'))
  event_points = []
  disaster_data = current_app.config['DISASTER_DASHBOARD_DATA']
  for event in disaster_data.get(event_type, {}).get(date, []):
    if (keep_event(event, place, filter_prop, filter_unit, filter_upper_limit,
                   filter_lower_limit)):
      event_formatted = {
          "dcid": event["eventId"],
          "dates": [event["startDate"]],
          "places": event["affectedPlaces"],
          "geoLocations": [{
              "point": {
                  "latitude": event["latitude"],
                  "longitude": event["longitude"]
              }
          }],
          "provenanceId": "",
          "propVals": {}
      }
      for eventKey in event.keys():
        if eventKey in EVENT_POINT_KEYS:
          continue
        event_formatted["propVals"][eventKey] = {"vals": [event[eventKey]]}
      event_points.append(event_formatted)
  result = {}
  if event_points:
    result = {"eventCollection": {"events": event_points, "provenanceInfo": {}}}
  return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/event-data')
def event_data():
  """Gets the event data for a given eventType, date, place, and
      filter information (filter prop, unit, lower limit, and upper limit).

  Returns: an object of the following form
    {
      eventCollection: {
        events: [
          {
            dcid: string,
            dates: list of strings,
            geoLocations: list of { point: { latitude: number, longitude: number } },
            places: list of strings,
            provenanceId: string,
            propVals: {
              [prop]: { vals: list of strings },
              ...
            }
          },
          ...
        ],
        provenanceInfo: {
          [provenanceId]: {
            domain: string,
            importName: string,
            provenanceUrl: string
          },
          ...
        }
      }
  """
  event_type = request.args.get('eventType', '')
  if not event_type:
    return "error: must provide a eventType field", 400
  date = request.args.get('date', '')
  if not date:
    return "error: must provide a date field", 400
  place = request.args.get('place', '')
  if not place:
    return "error: must provide a place field", 400
  filter_prop = request.args.get('filterProp', '')
  filter_unit = request.args.get('filterUnit', '')
  filter_upper_limit = float(request.args.get('filterUpperLimit', '0'))
  filter_lower_limit = float(request.args.get('filterLowerLimit', '0'))
  result = dc.get_event_collection(event_type, place, date, filter_prop,
                                   filter_unit, filter_upper_limit,
                                   filter_lower_limit)
  return Response(json.dumps(result), 200, mimetype='application/json')
