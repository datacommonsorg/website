# Copyright 2020 Google LLC
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

import json
import unittest
from unittest.mock import patch

from main import app

EVENT_TYPE_1 = "EarthquakeEvent"
DATE_1 = "2020-01"
DATE_2 = "1990-11"
PLACE_1 = "country/USA"
EVENT_1 = {
  "eventId": "event1",
  "name": "event1",
  "startDate": "2020-01-01",
  "endDate": "",
  "affectedPlaces": [PLACE_1],
  "longitude": 1,
  "latitude": 2,
  "magnitude": 4
}
EVENT_2 = {
  "eventId": "event1",
  "name": "event1",
  "startDate": "1990-11-01",
  "endDate": "",
  "affectedPlaces": [PLACE_1],
  "longitude": 1,
  "latitude": 2,
  "magnitude": 4
}
EVENT_3 = {
  "eventId": "event1",
  "name": "event1",
  "startDate": "2020-01-09",
  "endDate": "",
  "affectedPlaces": [],
  "longitude": 1,
  "latitude": 2,
  "magnitude": 4

}
TEST_DATA = {
  EVENT_TYPE_1: {
    DATE_1: [EVENT_1, EVENT_3],
    DATE_2: [EVENT_2]
  }
}
EARTH_DCID = "Earth"

class TestGetDateRange(unittest.TestCase):
  def test_has_data(self):
    with app.app_context():
      app.config['DISASTER_DASHBOARD_DATA'] = TEST_DATA
      response = app.test_client().get("/api/disaster-dashboard/date-range?eventType=" + EVENT_TYPE_1)
      assert response.status_code == 200
      response_data = json.loads(response.data)
      assert(response_data.get("maxDate") == DATE_1)
      assert(response_data.get("minDate") == DATE_2)
  
  def test_no_data(self):
    with app.app_context():
      app.config['DISASTER_DASHBOARD_DATA'] = TEST_DATA
      response = app.test_client().get("/api/disaster-dashboard/date-range?eventType=" + "TestEventType")
      assert response.status_code == 200
      response_data = json.loads(response.data)
      assert(response_data.get("maxDate") == "")
      assert(response_data.get("minDate") == "")


class TestGetData(unittest.TestCase):
  def test_earth_date_1_event_type_1(self):
    with app.app_context():
      app.config['DISASTER_DASHBOARD_DATA'] = TEST_DATA
      response = app.test_client().get('/api/disaster-dashboard/data?eventType={}&date={}&place={}'.format(EVENT_TYPE_1, DATE_1, EARTH_DCID))
      assert response.status_code == 200
      response_data = json.loads(response.data)
      assert(response_data == TEST_DATA[EVENT_TYPE_1][DATE_1])

  def test_earth_date_new_event_type_1(self):
    with app.app_context():
      app.config['DISASTER_DASHBOARD_DATA'] = TEST_DATA
      response = app.test_client().get('/api/disaster-dashboard/data?eventType={}&date={}&place={}'.format(EVENT_TYPE_1, "1997-01", EARTH_DCID))
      assert response.status_code == 200
      response_data = json.loads(response.data)
      assert(response_data == [])

  def test_earth_date_1_event_type_new(self):
    with app.app_context():
      app.config['DISASTER_DASHBOARD_DATA'] = TEST_DATA
      response = app.test_client().get('/api/disaster-dashboard/data?eventType={}&date={}&place={}'.format("TestEventType", DATE_1, EARTH_DCID))
      assert response.status_code == 200
      response_data = json.loads(response.data)
      assert(response_data == [])

  def test_place_1_date_1_event_type_1(self):
    with app.app_context():
      app.config['DISASTER_DASHBOARD_DATA'] = TEST_DATA
      response = app.test_client().get('/api/disaster-dashboard/data?eventType={}&date={}&place={}'.format(EVENT_TYPE_1, DATE_1, PLACE_1))
      assert response.status_code == 200
      response_data = json.loads(response.data)
      assert(response_data == [EVENT_1])

  def test_place_new_date_1_event_type_1(self):
    with app.app_context():
      app.config['DISASTER_DASHBOARD_DATA'] = TEST_DATA
      response = app.test_client().get('/api/disaster-dashboard/data?eventType={}&date={}&place={}'.format(EVENT_TYPE_1, DATE_1, "placeTest"))
      assert response.status_code == 200
      response_data = json.loads(response.data)
      assert(response_data == [])
