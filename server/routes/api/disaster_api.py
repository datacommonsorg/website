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

import json
import logging

from flask import Blueprint
from flask import current_app
from flask import request
from flask import Response

from server.cache import cache
import server.lib.util as lib_util
import server.services.datacommons as dc

# Define blueprint
bp = Blueprint("disaster_api", __name__, url_prefix='/api/disaster-dashboard')

EARTH_DCID = "Earth"
EVENT_POINT_KEYS = set(
    ["affectedPlaces", "latitude", "longitude", "startDate", "eventId"])
# Mixer event api takes a date of the format YYYY-MM (length of 7)
DATA_RETRIEVAL_DATE_LENGTH = 7


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
  use_cache = request.args.get('useCache', '')
  result = {'minDate': "", 'maxDate': ""}
  date_list = []
  if use_cache == '1':
    date_list = dc.get_event_collection_date(event_type,
                                             place).get('eventCollectionDate',
                                                        {}).get('dates', [])
  else:
    disaster_data = current_app.config['DISASTER_DASHBOARD_DATA']
    date_list = sorted(list(disaster_data.get(event_type, {}).keys()))
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
  if not filter_prop:
    # no props to filter by
    return True
  if not filter_prop in event:
    # Event doesn't contain the prop
    return False
  try:
    prop_val = event[filter_prop]
    val_string = prop_val[len(filter_unit):].strip()
    val = float(val_string)
    return val <= filter_upper_limit and val >= filter_lower_limit
  except:
    # can't parse the value to filter by into a float
    logging.info(
        f'Could not parse filter value for event: {event["eventId"]}, filter prop: {filter_prop}'
    )
    return False


def get_date_list(min_date: str, max_date: str):
  """
  Given a date range, gets the list of dates to retrieve data for.
  min_date and max_date must have the same date format of YYYY or YYYY-MM.
  """
  date_list = []
  min_year = min_date[0:4]
  max_year = max_date[0:4]
  # The minimum length of a date string from dates in the dateRange and dates
  # used for data retrieval. Dates used for data retrieval are YYYY-MM.
  min_date_str_length = min(len(min_date), DATA_RETRIEVAL_DATE_LENGTH)
  # Loop through every YYYY-MM date between minYear-01 and maxYear-12 and add
  # all dates that are within the dateRange.
  for year in range(int(min_year), int(max_year) + 1):
    for month in range(1, 13):
      date = f'{str(year)}-{str(month).zfill(2)}'
      if date[0:min_date_str_length] < min_date[0:min_date_str_length]:
        continue
      if date[0:min_date_str_length] > max_date[0:min_date_str_length]:
        continue
      date_list.append(date)
  return date_list


@bp.route('/json-event-data')
def json_event_data():
  """Gets the event data from saved jsons for a given eventType, date, place,
     andfilter information (filter prop, unit, lower limit, and upper limit).
     The date format must be YYYY or YYYY-MM

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
  min_date = request.args.get('minDate', '')
  if not min_date:
    return "error: must provide a minDate field", 400
  max_date = request.args.get('maxDate', '')
  if not max_date:
    return "error: must provide a maxDate field", 400
  place = request.args.get('place', '')
  if not place:
    return "error: must provide a place field", 400
  filter_prop = request.args.get('filterProp', '')
  filter_unit = request.args.get('filterUnit', '')
  filter_upper_limit = float(request.args.get('filterUpperLimit', float("inf")))
  filter_lower_limit = float(request.args.get('filterLowerLimit',
                                              -float("inf")))
  event_points = []
  disaster_data = current_app.config['DISASTER_DASHBOARD_DATA']
  date_list = get_date_list(min_date, max_date)
  for date in date_list:
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
  return lib_util.gzip_compress_response(result, is_json=True)


@bp.route('/event-data')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def event_data():
  """Gets the event data for a given eventType, date range, place, and
      filter information (filter prop, unit, lower limit, and upper limit).
      The date format must be YYYY or YYYY-MM

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
  min_date = request.args.get('minDate', '')
  if not min_date:
    return "error: must provide a minDate field", 400
  max_date = request.args.get('maxDate', '')
  if not max_date:
    return "error: must provide a maxDate field", 400
  place = request.args.get('place', '')
  if not place:
    return "error: must provide a place field", 400
  filter_prop = request.args.get('filterProp', '')
  filter_unit = request.args.get('filterUnit', '')
  req_upper = request.args.get('filterUpperLimit', None)
  filter_upper_limit = float(req_upper) if req_upper else None
  req_lower = request.args.get('filterLowerLimit', None)
  filter_lower_limit = float(req_lower) if req_lower else None
  date_list = get_date_list(min_date, max_date)
  event_points = []
  provenance_info = {}
  for date in date_list:
    event_collection = dc.get_event_collection(
        event_type, place, date, filter_prop, filter_unit, filter_upper_limit,
        filter_lower_limit).get("eventCollection", {})
    event_points.extend(event_collection.get("events", []))
    provenance_info.update(event_collection.get("provenanceInfo", {}))
  result = {}
  if event_points:
    result = {
        "eventCollection": {
            "events": event_points,
            "provenanceInfo": provenance_info
        }
    }
  return lib_util.gzip_compress_response(result, is_json=True)
