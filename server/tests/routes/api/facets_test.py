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

import unittest
from unittest import mock

import server.tests.routes.api.mock_data as mock_data
from web_app import app


class TestGetFacetsWithinPlace(unittest.TestCase):

  def test_required_params(self):
    """Failure if required fields are not present."""
    no_parent_place = app.test_client().get('api/facets/within',
                                            query_string={
                                                "childType": "County",
                                                "statVars": ["Count_Person"],
                                            })
    assert no_parent_place.status_code == 400

    no_child_type = app.test_client().get('api/facets/within',
                                          query_string={
                                              "parentPlace": "country/USA",
                                              "statVars": ["Count_Person"],
                                          })
    assert no_child_type.status_code == 400

    no_stat_vars = app.test_client().get('api/facets/within',
                                         query_string={
                                             "childType": "County",
                                             "parentPlace": "country/USA",
                                         })
    assert no_stat_vars.status_code == 400

  @mock.patch('server.routes.api.facets.dc.obs_point_within')
  def test_single_date(self, mock_point_within):
    expected_parent_place = "country/USA"
    expected_child_type = "State"
    expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
    expected_date = "2005"

    def point_within_side_effect(parent_place, child_type, stat_vars, date,
                                 all_facets):
      if (parent_place != expected_parent_place or
          child_type != expected_child_type or
          stat_vars != expected_stat_vars or not all_facets):
        return {}
      if date == "":
        return mock_data.POINT_WITHIN_LATEST_ALL_FACETS
      if date == expected_date:
        return mock_data.POINT_WITHIN_2015_ALL_FACETS

    mock_point_within.side_effect = point_within_side_effect
    endpoint_url = "api/facets/within"
    base_req_json = {
        "parentPlace": expected_parent_place,
        "childType": expected_child_type,
        "statVars": expected_stat_vars
    }

    latest_date_req_json = base_req_json.copy()
    latest_date_req_json["minDate"] = "latest"
    latest_date_req_json["maxDate"] = "latest"
    latest_date = app.test_client().get(endpoint_url,
                                        query_string=latest_date_req_json)
    assert latest_date.status_code == 200
    assert latest_date.data == b'{"Count_Person":{"1145703171":{"importName":"CensusACS5YearSurvey","measurementMethod":"CensusACS5yrSurvey","provenanceUrl":"https://www.census.gov/"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}},"UnemploymentRate_Person":{"1249140336":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyAdjusted","observationPeriod":"P1M","provenanceUrl":"https://www.bls.gov/lau/"},"2978659163":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1Y","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'

    single_date_req_json = base_req_json.copy()
    single_date_req_json["minDate"] = expected_date
    single_date_req_json["maxDate"] = expected_date
    single_date = app.test_client().get(endpoint_url,
                                        query_string=single_date_req_json)
    assert single_date.status_code == 200
    assert single_date.data == b'{"Count_Person":{"2176550201":{"importName":"USCensusPEP_Annual_Population","measurementMethod":"CensusPEPSurvey","observationPeriod":"P1Y","provenanceUrl":"https://www2.census.gov/programs-surveys/popest/tables"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}},"UnemploymentRate_Person":{"2978659163":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1Y","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'

  @mock.patch('server.routes.api.facets.dc.obs_series_within')
  def test_date_range(self, mock_series_within):
    expected_parent_place = "country/USA"
    expected_child_type = "State"
    expected_stat_vars = ["Count_Person", "UnemploymentRate_Person"]
    expected_min_date_year = "2015"
    expected_max_date_year = "2018"

    def series_within_side_effect(parent_place, child_type, stat_vars,
                                  all_facets):
      if parent_place == expected_parent_place and child_type == expected_child_type and stat_vars == expected_stat_vars and all_facets:
        return mock_data.SERIES_WITHIN_ALL_FACETS
      else:
        return {}

    mock_series_within.side_effect = series_within_side_effect
    resp = app.test_client().get('api/facets/within',
                                 query_string={
                                     "parentPlace": expected_parent_place,
                                     "childType": expected_child_type,
                                     "statVars": expected_stat_vars,
                                     "minDate": expected_min_date_year,
                                     "maxDate": expected_max_date_year
                                 })
    assert resp.status_code == 200
    assert resp.data == b'{"Count_Person":{"1145703171":{"importName":"CensusACS5YearSurvey","measurementMethod":"CensusACS5yrSurvey","provenanceUrl":"https://www.census.gov/"},"2517965213":{"importName":"CensusPEP","measurementMethod":"CensusPEPSurvey","provenanceUrl":"https://www.census.gov/programs-surveys/popest.html"}},"UnemploymentRate_Person":{"1249140336":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyAdjusted","observationPeriod":"P1M","provenanceUrl":"https://www.bls.gov/lau/"},"324358135":{"importName":"BLS_LAUS","measurementMethod":"BLSSeasonallyUnadjusted","observationPeriod":"P1M","provenanceUrl":"https://www.bls.gov/lau/"}}}\n'
