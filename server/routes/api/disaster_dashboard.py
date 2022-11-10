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
bp = Blueprint("disaster-dashboard",
               __name__,
               url_prefix='/api/disaster-dashboard')

EARTH_DCID = "Earth"


@bp.route('/date-range')
def date_range():
    """
    Gets the date range for a specific event type

    Returns: an object with minDate and maxDate
        {
            minDate: string,
            maxDate: string
        }
    """
    event_type = request.args.get('eventType', '')
    result = {"minDate": "", "maxDate": ""}
    if event_type in current_app.config['DISASTER_DASHBOARD_DATA']:
        dates = list(current_app.config['DISASTER_DASHBOARD_DATA'].get(
            event_type).keys())
        if dates:
            dates = sorted(dates)
            result = {"minDate": dates[0], "maxDate": dates[-1]}
    return json.dumps(result), 200


@bp.route('/data')
def data():
    """
    Gets the data for a given eventType, date, and place

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
    date = request.args.get('date', '')
    place = request.args.get('place', '')
    result = []
    for event in current_app.config['DISASTER_DASHBOARD_DATA'].get(
            event_type, {}).get(date, []):
        if place != EARTH_DCID and not place in event.get("affectedPlaces", []):
            continue
        result.append(event)
    return json.dumps(result), 200
