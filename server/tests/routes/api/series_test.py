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
import json
import unittest
from unittest import mock

import server.tests.routes.api.mock_data as mock_data
from web_app import app


class TestApiSeriesWithin(unittest.TestCase):

  def test_required_predicates(self):
    """Failure if required fields are not present."""
    no_parent_entity = app.test_client().get('/api/observations/series/within',
                                             query_string={
                                                 'child_type': 'City',
                                                 'variables': ['Count_Person']
                                             })
    assert no_parent_entity.status_code == 400

    no_child_type = app.test_client().get('/api/observations/series/within',
                                          query_string={
                                              'parent_entity': 'country/USA',
                                              'variables': ['Count_Person']
                                          })
    assert no_child_type.status_code == 400

    no_stat_var = app.test_client().get('/api/observations/series/within',
                                        query_string={
                                            'parent_entity': 'country/USA',
                                            'child_type': 'City'
                                        })
    assert no_stat_var.status_code == 400

  @mock.patch('server.services.datacommons.post')
  def test_api_observations_series_within_all(self, post):
    result = {
        'data': {
            'Count_Person': {
                'geoId/01': [
                    {
                        'facet':
                            '2517965213',
                        'series': [{
                            'date': '2014',
                            'value': 1021869
                        }, {
                            'date': '2015',
                            'value': 1030475
                        }, {
                            'date': '2017',
                            'value': 1052482
                        }, {
                            'date': '2018',
                            'value': 1060665
                        }, {
                            'date': '2019',
                            'value': 1068778
                        }]
                    },
                    {
                        'facet':
                            '1145703171',
                        'series': [{
                            'date': '2011',
                            'value': 4747424
                        }, {
                            'date': '2012',
                            'value': 4777326
                        }]
                    },
                ],
                'geoId/06': [{
                    'facet':
                        '2517965213',
                    'series': [{
                        'date': '2014',
                        'value': 2817628
                    }, {
                        'date': '2015',
                        'value': 2866939
                    }, {
                        'date': '2016',
                        'value': 2917563
                    }, {
                        'date': '2017',
                        'value': 2969905
                    }]
                }]
            },
            'UnemploymentRate_Person': {
                'geoId/01': [
                    {
                        'facet':
                            '324358135',
                        'series': [{
                            'date': '1979-01',
                            'value': 6.6
                        }, {
                            'date': '2018-01',
                            'value': 4.5
                        }, {
                            'date': '2015-05',
                            'value': 4.2
                        }, {
                            'date': '2018-07',
                            'value': 3.9
                        }, {
                            'date': '2017-11',
                            'value': 4
                        }, {
                            'date': '2019-05',
                            'value': 3.6
                        }]
                    },
                    {
                        'facet':
                            '1249140336',
                        'series': [{
                            'date': '2019',
                            'value': 3.2
                        }, {
                            'date': '2020',
                            'value': 6.5
                        }, {
                            'date': '2021',
                            'value': 3.4
                        }]
                    },
                ],
                'geoId/06': [{
                    'facet':
                        '324358135',
                    'series': [{
                        'date': '2015-10',
                        'value': 6.4
                    }, {
                        'date': '2017-05',
                        'value': 4.8
                    }, {
                        'date': '1991-08',
                        'value': 5.6
                    }, {
                        'date': '2018-08',
                        'value': 4.3
                    }, {
                        'date': '2018-03',
                        'value': 4.6
                    }, {
                        'date': '2020-04',
                        'value': 1.2
                    }]
                }],
            }
        },
        'facets': {
            '324358135': {
                'importName': 'BLS_LAUS',
                'measurementMethod': 'BLSSeasonallyUnadjusted',
                'observationPeriod': 'P1M',
                'provenanceUrl': 'https://www.bls.gov/lau/'
            },
            '1145703171': {
                'importName': 'CensusACS5YearSurvey',
                'measurementMethod': 'CensusACS5yrSurvey',
                'provenanceUrl': 'https://www.census.gov/'
            },
            '1249140336': {
                'importName': 'BLS_LAUS',
                'measurementMethod': 'BLSSeasonallyAdjusted',
                'observationPeriod': 'P1M',
                'provenanceUrl': 'https://www.bls.gov/lau/'
            },
            '2517965213': {
                'importName':
                    'CensusPEP',
                'measurementMethod':
                    'CensusPEPSurvey',
                'provenanceUrl':
                    'https://www.census.gov/programs-surveys/popest.html'
            },
        },
    }

    def side_effect(url, data):
      if url.endswith('/v1/bulk/observations/series/linked') and data == {
          'linked_entity': 'country/USA',
          'linked_property': 'containedInPlace',
          'entity_type': 'State',
          'variables': ['Count_Person', 'UnemploymentRate_Person'],
          'all_facets': True
      }:
        return mock_data.SERIES_WITHIN_ALL_FACETS

    post.side_effect = side_effect
    response = app.test_client().get(
        '/api/observations/series/within/all',
        query_string={
            'parent_entity': 'country/USA',
            'child_type': 'State',
            'variables': ['Count_Person', 'UnemploymentRate_Person']
        })
    assert response.status_code == 200
    assert json.loads(response.data) == result
