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
"""Helper functions for getting disaster dashboard data for the app config"""

import json
import logging
import re

from google.cloud import storage

EVENT_TYPES = [
    "FireEvent", "WildlandFireEvent", "WildfireEvent", "CycloneEvent",
    "HurricaneTyphoonEvent", "HurricaneEvent", "TornadoEvent", "FloodEvent",
    "DroughtEvent", "WetBulbTemperatureEvent", "ColdTemperatureEvent",
    "HeatTemperatureEvent"
]
DISASTER_DATA_FOLDER = "disaster_dashboard/"


def get_disaster_dashboard_data(gcs_bucket):
  """
  Gets and processes disaster data from gcs.
  Returns
      A dictionary of event type to dictionary of date (YYYY-MM) to list of
      events:
      {
          [eventType]: {
              [date]: [
                  {
                      eventId: string,
                      name: string,
                      startDate: string,
                      endDate: string
                      affectedPlaces: list of string,
                      longitude: number,
                      latitude: number,
                      ... other properties depending on the event (e.g., EarthquakeEvent will have magnitude)
                  },
                  ...
              ],
              ...
          },
          ...
      }
  """
  result = {}
  for event_type in EVENT_TYPES:
    storage_client = storage.Client()
    bucket = storage_client.get_bucket(gcs_bucket)
    file_name = re.sub('(?!^)([A-Z]+)', r'_\1', event_type).lower() + ".json"
    blob = bucket.get_blob(DISASTER_DATA_FOLDER + file_name)
    if not blob:
      logging.info(f'file for {event_type} not found, skipping.')
      continue
    events_data = json.loads(blob.download_as_bytes())
    events_by_date = {}
    for event_data in events_data:
      start_date = event_data.get("startDate", "")
      if not start_date:
        continue
      start_date_year_month = start_date[0:7]
      if start_date_year_month not in events_by_date:
        events_by_date[start_date_year_month] = []
      events_by_date[start_date_year_month].append(event_data)
    result[event_type] = events_by_date
  return result
