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


class TestApiPointWithin(unittest.TestCase):

  def test_required_predicates(self):
    """Failure if required fields are not present."""
    no_parent_entity = app.test_client().get('/api/observations/point/within',
                                             query_string={
                                                 'child_type': 'City',
                                                 'variables': ['Count_Person']
                                             })
    assert no_parent_entity.status_code == 400

    no_child_type = app.test_client().get('/api/observations/point/within',
                                          query_string={
                                              'parent_entity': 'country/USA',
                                              'variables': ['Count_Person']
                                          })
    assert no_child_type.status_code == 400

    no_stat_var = app.test_client().get('/api/observations/point/within',
                                        query_string={
                                            'parent_entity': 'country/USA',
                                            'child_type': 'City'
                                        })
    assert no_stat_var.status_code == 400

  @mock.patch('server.services.datacommons.post')
  def test_api_observations_point_within(self, post):
    result = {
        'data': {
            'Count_Person': {
                'geoId/01': {
                    'date': '2015',
                    'facet': '2517965213',
                    'value': 3120960
                },
                'geoId/02': {
                    'date': '2015',
                    'facet': '2517965213',
                    'value': 625216
                },
                'geoId/06': {
                    'date': '2015',
                    'facet': '2517965213',
                    'value': 9931715
                },
            },
            'UnemploymentRate_Person': {
                'geoId/01': {
                    'date': '2015',
                    'facet': '2978659163',
                    'value': 12
                },
                'geoId/02': {
                    'date': '2015',
                    'facet': '2978659163',
                    'value': 5.6
                },
                'geoId/06': {
                    'date': '2015',
                    'facet': '2978659163',
                    'value': 3.7
                },
            }
        },
        'facets': {
            '2517965213': {
                'importName':
                    'CensusPEP',
                'measurementMethod':
                    'CensusPEPSurvey',
                'provenanceUrl':
                    'https://www.census.gov/programs-surveys/popest.html'
            },
            '2978659163': {
                'importName': 'BLS_LAUS',
                'measurementMethod': 'BLSSeasonallyUnadjusted',
                'observationPeriod': 'P1Y',
                'provenanceUrl': 'https://www.bls.gov/lau/',
                'unit': 'testUnit',
                'unitDisplayName': 'shortUnit'
            }
        },
    }

    def post_side_effect(url, data):
      if url.endswith('/v2/observation') and data == {
          'select': ['date', 'value', 'variable', 'entity'],
          'entity': {
              'expression': 'country/USA<-containedInPlace+{typeOf:State}'
          },
          'variable': {
              'dcids': ['Count_Person', 'UnemploymentRate_Person']
          },
          'date': '2015',
      }:
        return mock_data.POINT_WITHIN_2015_ALL_FACETS

      if url.endswith('/v1/bulk/triples/out') and data == {
          'nodes': ['testUnit'],
      }:
        return {
            'data': [{
                'node': 'testUnit',
                'triples': {
                    'name': {
                        'nodes': [{
                            'value': 'longUnitName'
                        }]
                    },
                    'shortDisplayName': {
                        'nodes': [{
                            'value': 'shortUnit'
                        }]
                    },
                }
            }]
        }

    post.side_effect = post_side_effect

    response = app.test_client().get(
        '/api/observations/point/within',
        query_string={
            'parent_entity': 'country/USA',
            'child_type': 'State',
            'date': '2015',
            'variables': ['Count_Person', 'UnemploymentRate_Person']
        })
    assert response.status_code == 200
    assert json.loads(response.data) == result
