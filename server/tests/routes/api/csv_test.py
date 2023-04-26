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

import unittest
from unittest import mock

import server.tests.routes.api.mock_data as mock_data
from web_app import app


class TestGetStatsWithinPlaceCsv(unittest.TestCase):

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

  @mock.patch('server.routes.api.csv.dc.obs_point_within')
  @mock.patch('server.routes.api.csv.names')
  def test_single_date(self, mock_place_names, mock_point_within):
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
    latest_date = app.test_client().post(endpoint_url,
                                         json=latest_date_req_json)
    assert latest_date.status_code == 200
    assert latest_date.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
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
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
        "geoId/01,Alabama,2015,3120960,https://www.census.gov/programs-surveys/popest.html,2015,12,https://www.bls.gov/lau/\r\n"
        +
        "geoId/02,,2015,625216,https://www.census.gov/programs-surveys/popest.html,2015,5.6,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2015,9931715,https://www.census.gov/programs-surveys/popest.html,2015,3.7,https://www.bls.gov/lau/\r\n"
    )

    latest_date_facets_req_json = base_req_json.copy()
    latest_date_facets_req_json["minDate"] = "latest"
    latest_date_facets_req_json["maxDate"] = "latest"
    latest_date_facets_req_json["facetMap"] = {
        "Count_Person": "1145703171",
        "UnemploymentRate_Person": "1249140336"
    }
    latest_date_facets = app.test_client().post(
        endpoint_url, json=latest_date_facets_req_json)
    assert latest_date_facets.status_code == 200
    assert latest_date_facets.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
        "geoId/01,Alabama,2020,4893186,https://www.census.gov/,2022-04,2.8,https://www.bls.gov/lau/\r\n"
        +
        "geoId/02,,2020,736990,https://www.census.gov/,2022-04,4.9,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,2020,836990,https://www.census.gov/,,,\r\n")

    single_date_facets_req_json = base_req_json.copy()
    single_date_facets_req_json["minDate"] = expected_date
    single_date_facets_req_json["maxDate"] = expected_date
    single_date_facets_req_json["facetMap"] = {
        "Count_Person": "2517965213",
        "UnemploymentRate_Person": ""
    }
    single_date_facets = app.test_client().post(
        endpoint_url, json=single_date_facets_req_json)
    assert single_date_facets.status_code == 200
    assert single_date_facets.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
        "geoId/01,Alabama,2015,3120960,https://www.census.gov/programs-surveys/popest.html,2015,12,https://www.bls.gov/lau/\r\n"
        +
        "geoId/02,,2015,625216,https://www.census.gov/programs-surveys/popest.html,2015,5.6,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2015,9931715,https://www.census.gov/programs-surveys/popest.html,2015,3.7,https://www.bls.gov/lau/\r\n"
    )

  @mock.patch('server.routes.api.csv.dc.obs_series_within')
  @mock.patch('server.routes.api.csv.names')
  def test_date_range(self, mock_place_names, mock_series_within):
    expected_parent_place = "country/USA"
    expected_child_type = "State"
    children_places = ["geoId/01", "geoId/06"]
    expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
    expected_min_date_year = "2015"
    expected_max_date_year = "2018"
    expected_min_date_month = "2015-01"
    expected_max_date_month = "2018-01"

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

    all_dates = app.test_client().post(endpoint_url, json=base_req_json)
    assert all_dates.status_code == 200
    assert all_dates.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

    min_year_req_json = base_req_json.copy()
    min_year_req_json["minDate"] = expected_min_date_year
    min_year = app.test_client().post(endpoint_url, json=min_year_req_json)
    assert min_year.status_code == 200
    assert min_year.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

    min_month_req_json = base_req_json.copy()
    min_month_req_json["minDate"] = expected_min_date_month
    min_month = app.test_client().post(endpoint_url, json=min_month_req_json)
    assert min_month.status_code == 200
    assert min_month.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,2019,1068778,https://www.census.gov/programs-surveys/popest.html,2019-05,3.6,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

    max_year_req_json = base_req_json.copy()
    max_year_req_json["maxDate"] = expected_max_date_year
    max_year = app.test_client().post(endpoint_url, json=max_year_req_json)
    assert max_year.status_code == 200
    assert max_year.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        + "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n")

    max_month_req_json = base_req_json.copy()
    max_month_req_json["maxDate"] = expected_max_date_month
    max_month = app.test_client().post(endpoint_url, json=max_month_req_json)
    assert max_month.status_code == 200
    assert max_month.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,2014,1021869,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        + "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,2014,2817628,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
    )

    min_and_max_year_req_json = base_req_json.copy()
    min_and_max_year_req_json["minDate"] = expected_min_date_year
    min_and_max_year_req_json["maxDate"] = expected_max_date_year
    min_and_max_year = app.test_client().post(endpoint_url,
                                              json=min_and_max_year_req_json)
    assert min_and_max_year.status_code == 200
    assert min_and_max_year.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
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

    min_and_max_month_req_json = base_req_json.copy()
    min_and_max_month_req_json["minDate"] = expected_min_date_month
    min_and_max_month_req_json["maxDate"] = expected_max_date_month
    min_and_max_month = app.test_client().post(endpoint_url,
                                               json=min_and_max_month_req_json)
    assert min_and_max_month.status_code == 200
    assert min_and_max_month.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
    )

    min_year_max_month_req_json = base_req_json.copy()
    min_year_max_month_req_json["minDate"] = expected_min_date_year
    min_year_max_month_req_json["maxDate"] = expected_max_date_month
    min_year_max_month = app.test_client().post(
        endpoint_url, json=min_year_max_month_req_json)
    assert min_year_max_month.status_code == 200
    assert min_year_max_month.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
        "geoId/01,,2015,1030475,https://www.census.gov/programs-surveys/popest.html,2015-05,4.2,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2017,1052482,https://www.census.gov/programs-surveys/popest.html,2017-11,4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/01,,2018,1060665,https://www.census.gov/programs-surveys/popest.html,2018-01,4.5,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2015,2866939,https://www.census.gov/programs-surveys/popest.html,2015-10,6.4,https://www.bls.gov/lau/\r\n"
        +
        "geoId/06,California,2016,2917563,https://www.census.gov/programs-surveys/popest.html,,,\r\n"
        +
        "geoId/06,California,2017,2969905,https://www.census.gov/programs-surveys/popest.html,2017-05,4.8,https://www.bls.gov/lau/\r\n"
    )

    min_month_max_year_req_json = base_req_json.copy()
    min_month_max_year_req_json["minDate"] = expected_min_date_month
    min_month_max_year_req_json["maxDate"] = expected_max_date_year
    min_month_max_year = app.test_client().post(
        endpoint_url, json=min_month_max_year_req_json)
    assert min_month_max_year.status_code == 200
    assert min_month_max_year.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        +
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

    all_dates_facet_req_json = base_req_json.copy()
    all_dates_facet_req_json["facetMap"] = {
        "Count_Person": "1145703171",
        "UnemploymentRate_Person": ""
    }
    all_dates_facet = app.test_client().post(endpoint_url,
                                             json=all_dates_facet_req_json)
    assert all_dates_facet.status_code == 200
    assert all_dates_facet.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        + "geoId/01,,,,,1979-01,6.6,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,2011,4747424,https://www.census.gov/,,,\r\n" +
        "geoId/01,,2012,4777326,https://www.census.gov/,,,\r\n" +
        "geoId/01,,,,,2015-05,4.2,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,,,,2017-11,4,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,,,,2018-01,4.5,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,,,,2019-05,3.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,1991-08,5.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2015-10,6.4,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2017-05,4.8,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2020-04,1.2,https://www.bls.gov/lau/\r\n")

    min_and_max_year_facet_req_json = base_req_json.copy()
    min_and_max_year_facet_req_json["minDate"] = expected_min_date_year
    min_and_max_year_facet_req_json["maxDate"] = expected_max_date_year
    min_and_max_year_facet_req_json["facetMap"] = {
        "Count_Person": "1145703171",
        "UnemploymentRate_Person": ""
    }
    min_and_max_year_facet = app.test_client().post(
        endpoint_url, json=min_and_max_year_facet_req_json)
    assert min_and_max_year_facet.status_code == 200
    assert min_and_max_year_facet.data.decode("utf-8") == (
        "placeDcid,placeName,Date:Count_Person,Value:Count_Person,Source:Count_Person,Date:UnemploymentRate_Person,Value:UnemploymentRate_Person,Source:UnemploymentRate_Person\r\n"
        + "geoId/01,,,,,2015-05,4.2,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,,,,2017-11,4,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,,,,2018-01,4.5,https://www.bls.gov/lau/\r\n" +
        "geoId/01,,,,,2018-07,3.9,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2015-10,6.4,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2017-05,4.8,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-03,4.6,https://www.bls.gov/lau/\r\n" +
        "geoId/06,California,,,,2018-08,4.3,https://www.bls.gov/lau/\r\n")
