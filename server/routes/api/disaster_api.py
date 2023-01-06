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

from flask import Blueprint, request, current_app
import services.datacommons as dc
from lib.gcs import list_blobs
import json

# Define blueprint
bp = Blueprint("disaster_api", __name__, url_prefix='/api/disaster-dashboard')

EARTH_DCID = "Earth"


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
  return json.dumps(result), 200


@bp.route('/event-data')
def event_data():
  """Gets the event data for a given eventType, date, place, and
      filter information (filter prop, unit, lower limit, and upper limit).

  Returns: a list of events of the following form
      {
          eventId: string,
          name: string,
          startDate: string,
          endDate: string
          affectedPlaces: list of string,
          longitude: number,
          latitude: number,
          ... (optional properties depending on the event (e.g., EarthquakeEvent will have magnitude)
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
  filter_upper_limit = request.args.get('filterUpperLimit', None)
  filter_lower_limit = request.args.get('filterLowerLimit', None)
  # if filtering values, need all of filter prop, filter upper limit, and filter
  # lower limit. Filter unit is optional.
  if filter_prop and filter_upper_limit and filter_lower_limit:
    result = dc.get_event_collection(event_type, place, date, filter_prop,
                                     filter_unit, float(filter_upper_limit),
                                     float(filter_lower_limit))
  else:
    result = dc.get_event_collection(event_type, place, date)
  return json.dumps(result), 200
