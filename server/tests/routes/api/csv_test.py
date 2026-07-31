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

from functools import wraps
import unittest
from unittest import mock

import server.tests.routes.api.mock_data as mock_data
from shared.lib.constants import SURFACE_HEADER_NAME
from shared.lib.constants import TEST_SURFACE_HEADER
from web_app import app

CSV_HEADERS = "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"

TIDY_CSV_HEADERS = (
    "Entity DCID,Entity properties isoCode,Entity properties name,"
    "Variable DCID,Variable observation date,"
    "Variable observation metadata importName,"
    "Variable observation metadata measurementMethod,"
    "Variable observation metadata observationPeriod,"
    "Variable observation metadata provenanceUrl,"
    "Variable observation metadata scalingFactor,"
    "Variable observation metadata unit,"
    "Variable observation metadata unitDisplayName,"
    "Variable observation value,Variable properties name\r\n")


def with_request_context(headers=None):
  """Decorator to wrap a test function in a Flask request context."""

  def decorator(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):
      with app.test_request_context(headers=headers or {}):
        return f(*args, **kwargs)

    return decorated_function

  return decorator


class TestGetStatsWithinPlaceCsv(unittest.TestCase):
  """
  Tests for the legacy (wide) CSV format.

  Used when the new download tool feature flag is disabled.
  """

  def test_required_params(self):
    """Failure if required fields are not present."""
    no_parent_place = app.test_client().post('api/csv/within',
                                             json={
                                                 "childType": "County",
                                                 "statVars": ["Count_Person"],
                                             })
    assert no_parent_place.status_code == 400

    no_child_type = app.test_client().post('api/csv/within',
                                           json={
                                               "parentPlace": "country/USA",
                                               "statVars": ["Count_Person"]
                                           })
    assert no_child_type.status_code == 400

    no_stat_vars = app.test_client().post('api/csv/within',
                                          json={
                                              "parentPlace": "country/USA",
                                              "childType": "County"
                                          })
    assert no_stat_vars.status_code == 400

  @with_request_context(headers=TEST_SURFACE_HEADER)
  @mock.patch('server.routes.shared_api.csv.is_feature_enabled')
  @mock.patch('server.routes.shared_api.csv.dc.obs_point_within')
  @mock.patch('server.routes.shared_api.csv.names')
  def test_single_date(self, mock_place_names, mock_point_within, mock_flag):
    mock_flag.return_value = False
    expected_parent_place = "country/USA"
    expected_child_type = "State"
    children_places = ["geoId/01", "geoId/02", "geoId/06"]
    expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
    expected_date = "2015"

    def place_side_effect(places):
      if places == children_places:
        return {"geoId/01": "Alabama", "geoId/02": "", "geoId/06": "California"}
      else:
        return {}

    mock_place_names.side_effect = place_side_effect

    def point_within_side_effect(parent_place, child_type, stat_vars, date):
      if (parent_place != expected_parent_place or
          child_type != expected_child_type or
          set(stat_vars) != set(expected_stat_vars)):
        return {}
      if date == "LATEST":
        return mock_data.POINT_WITHIN_LATEST_ALL_FACETS
      if date == expected_date:
        return mock_data.POINT_WITHIN_2015_ALL_FACETS

    mock_point_within.side_effect = point_within_side_effect
    endpoint_url = "api/csv/within"
    base_req_json = {
        "parentPlace": expected_parent_place,
        "childType": expected_child_type,
        "statVars": expected_stat_vars
    }

    latest_date_req_json = base_req_json.copy()
    latest_date_req_json["minDate"] = "latest"
    latest_date_req_json["maxDate"] = "latest"
    latest_date = app.test_client().post(
        endpoint_url,
        json=latest_date_req_json,
        headers={SURFACE_HEADER_NAME: TEST_SURFACE_HEADER})
    assert latest_date.status_code == 200
    assert latest_date.data.decode("utf-8") == (
        CSV_HEADERS +
        "geoId/01,Alabama,2020,4893186,https://www.census.gov/,2022-04,2.8,https://www.bls.gov/lau/\r\n"
        +
        "geoId/02,,2020,736990,https://www.census.gov/,2022-04,4.9,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2020,836990,https://www.census.gov/,2022-03,6.4,https://www.bls.gov/lau/\r\n"
    )

    single_date_req_json = base_req_json.copy()
    single_date_req_json["minDate"] = expected_date
    single_date_req_json["maxDate"] = expected_date
    single_date = app.test_client().post(endpoint_url,
                                         json=single_date_req_json)
    assert single_date.status_code == 200
    assert single_date.data.decode("utf-8") == (
        CSV_HEADERS +
        "geoId/01,Alabama,2015,3120960,https://www.census.gov/programs-surveys/popest.html,2015,12,https://www.bls.gov/lau/\r\n"
        +
        "geoId/02,,2015,625216,https://www.census.gov/programs-surveys/popest.html,2015,5.6,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2015,9931715,https://www.census.gov/programs-surveys/popest.html,2015,3.7,https://www.bls.gov/lau/\r\n"
    )

  @mock.patch('server.routes.shared_api.csv.is_feature_enabled')
  @mock.patch('server.routes.shared_api.csv.dc.obs_series_within')
  @mock.patch('server.routes.shared_api.csv.names')
  def test_date_range(self, mock_place_names, mock_series_within, mock_flag):
    mock_flag.return_value = False
    expected_parent_place = "country/USA"
    expected_child_type = "State"
    children_places = ["geoId/01", "geoId/06"]
    expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
    expected_min_date_year = "2015"
    expected_max_date_year = "2018"

    def place_side_effect(places):
      if places == children_places:
        return {"geoId/01": "", "geoId/06": "California"}
      else:
        return {}

    mock_place_names.side_effect = place_side_effect

    def series_within_side_effect(parent_place, child_type, stat_vars):
      if (parent_place == expected_parent_place and
          child_type == expected_child_type and
          stat_vars == expected_stat_vars):
        return mock_data.SERIES_WITHIN_ALL_FACETS
      else:
        return {}

    mock_series_within.side_effect = series_within_side_effect
    endpoint_url = "api/csv/within"
    base_req_json = {
        "parentPlace": expected_parent_place,
        "childType": expected_child_type,
        "statVars": expected_stat_vars
    }

    min_and_max_year_req_json = base_req_json.copy()
    min_and_max_year_req_json["minDate"] = expected_min_date_year
    min_and_max_year_req_json["maxDate"] = expected_max_date_year
    min_and_max_year = app.test_client().post(endpoint_url,
                                              json=min_and_max_year_req_json)
    assert min_and_max_year.status_code == 200
    assert min_and_max_year.data.decode("utf-8") == (
        CSV_HEADERS +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n")


class TestGetStatsWithinPlaceCsvTidyFormat(unittest.TestCase):
  """
  Tests for the tidy CSV format.

  Used by the new download tool (one row per entity/variable/date).
  """

  def setUp(self):
    self.entity_props = {
        "geoId/01": {
            "isoCode": ["US-AL"],
            "name": ["Alabama"]
        },
        "geoId/02": {
            "isoCode": [],
            "name": []
        },
        "geoId/06": {
            "isoCode": ["US-CA"],
            "name": ["California"]
        },
    }
    self.variable_props = {
        "Count_Person": {
            "name": ["Population"]
        },
        "UnemploymentRate_Person": {
            "name": ["Unemployment Rate"]
        },
    }

  def _mock_property_values(self, nodes, props):
    if props == ["isoCode", "name"]:
      return {node: self.entity_props.get(node, {}) for node in nodes}
    if props == ["name"]:
      return {node: self.variable_props.get(node, {}) for node in nodes}
    return {}

  @mock.patch('server.routes.shared_api.csv.fetch.multiple_property_values')
  @mock.patch('server.routes.shared_api.csv.fetch.get_processed_facets')
  @mock.patch('server.routes.shared_api.csv.is_feature_enabled')
  @mock.patch('server.routes.shared_api.csv.dc.obs_point_within')
  def test_single_date(self, mock_point_within, mock_flag,
                       mock_get_processed_facets, mock_property_values):
    mock_flag.return_value = True
    mock_get_processed_facets.side_effect = lambda facets: facets
    mock_property_values.side_effect = self._mock_property_values

    expected_parent_place = "country/USA"
    expected_child_type = "State"
    expected_stat_vars = ["Count_Person"]
    expected_date = "2015"

    def point_within_side_effect(parent_place, child_type, stat_vars, date):
      if (parent_place != expected_parent_place or
          child_type != expected_child_type or
          set(stat_vars) != set(expected_stat_vars)):
        return {}
      if date == expected_date:
        return mock_data.POINT_WITHIN_2015_ALL_FACETS

    mock_point_within.side_effect = point_within_side_effect

    req_json = {
        "parentPlace": expected_parent_place,
        "childType": expected_child_type,
        "statVars": expected_stat_vars,
        "minDate": expected_date,
        "maxDate": expected_date,
    }
    resp = app.test_client().post("api/csv/within", json=req_json)
    assert resp.status_code == 200
    assert resp.data.decode("utf-8") == (
        TIDY_CSV_HEADERS +
        "geoId/01,US-AL,Alabama,Count_Person,2015,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,,,3120960,Population\r\n"
        +
        "geoId/02,,,Count_Person,2015,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,,,625216,Population\r\n"
        +
        "geoId/06,US-CA,California,Count_Person,2015,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,,,9931715,Population\r\n"
    )

  @mock.patch('server.routes.shared_api.csv.fetch.multiple_property_values')
  @mock.patch('server.routes.shared_api.csv.fetch.get_processed_facets')
  @mock.patch('server.routes.shared_api.csv.is_feature_enabled')
  @mock.patch('server.routes.shared_api.csv.dc.obs_series_within')
  def test_date_range(self, mock_series_within, mock_flag,
                      mock_get_processed_facets, mock_property_values):
    mock_flag.return_value = True
    mock_get_processed_facets.side_effect = lambda facets: facets
    mock_property_values.side_effect = self._mock_property_values

    expected_parent_place = "country/USA"
    expected_child_type = "State"
    expected_stat_vars = ["Count_Person"]

    def series_within_side_effect(parent_place, child_type, stat_vars):
      if (parent_place == expected_parent_place and
          child_type == expected_child_type and
          stat_vars == expected_stat_vars):
        return mock_data.SERIES_WITHIN_ALL_FACETS
      return {}

    mock_series_within.side_effect = series_within_side_effect

    req_json = {
        "parentPlace": expected_parent_place,
        "childType": expected_child_type,
        "statVars": expected_stat_vars,
        "minDate": "2015",
        "maxDate": "2018",
    }
    resp = app.test_client().post("api/csv/within", json=req_json)
    assert resp.status_code == 200
    assert resp.data.decode("utf-8") == (
        TIDY_CSV_HEADERS +
        "geoId/01,US-AL,Alabama,Count_Person,2015,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,testUnit,,1030475,Population\r\n"
        +
        "geoId/01,US-AL,Alabama,Count_Person,2017,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,testUnit,,1052482,Population\r\n"
        +
        "geoId/01,US-AL,Alabama,Count_Person,2018,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,testUnit,,1060665,Population\r\n"
        +
        "geoId/06,US-CA,California,Count_Person,2015,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,testUnit,,2866939,Population\r\n"
        +
        "geoId/06,US-CA,California,Count_Person,2016,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,testUnit,,2917563,Population\r\n"
        +
        "geoId/06,US-CA,California,Count_Person,2017,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,testUnit,,2969905,Population\r\n"
    )

  @mock.patch('server.routes.shared_api.csv.fetch.multiple_property_values')
  @mock.patch('server.routes.shared_api.csv.fetch.get_processed_facets')
  @mock.patch('server.routes.shared_api.csv.is_feature_enabled')
  @mock.patch('server.routes.shared_api.csv.dc.obs_point_within')
  def test_row_limit(self, mock_point_within, mock_flag,
                     mock_get_processed_facets, mock_property_values):
    mock_flag.return_value = True
    mock_get_processed_facets.side_effect = lambda facets: facets
    mock_property_values.side_effect = self._mock_property_values

    expected_parent_place = "country/USA"
    expected_child_type = "State"
    expected_stat_vars = ["Count_Person"]
    expected_date = "2015"

    mock_point_within.return_value = mock_data.POINT_WITHIN_2015_ALL_FACETS

    req_json = {
        "parentPlace": expected_parent_place,
        "childType": expected_child_type,
        "statVars": expected_stat_vars,
        "minDate": expected_date,
        "maxDate": expected_date,
        "rowLimit": 1,
    }
    resp = app.test_client().post("api/csv/within", json=req_json)
    assert resp.status_code == 200
    assert resp.data.decode("utf-8") == (
        TIDY_CSV_HEADERS +
        "geoId/01,US-AL,Alabama,Count_Person,2015,CensusPEP,CensusPEPSurvey,,https://www.census.gov/programs-surveys/popest.html,,,,3120960,Population\r\n"
    )
