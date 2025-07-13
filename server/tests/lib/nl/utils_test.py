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
"""Tests for utils functions."""

import unittest
from unittest.mock import patch

from parameterized import parameterized

import server.lib.nl.common.utils as utils
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Date
import server.lib.util as util
import server.services.datacommons as dc

TEST_FACET_DATA_YYYY = {
    'facet': "test",
    'obsCount': 3,
    'earliestDate': '2015',
    'latestDate': '2025'
}
TEST_FACET_METADATA_YYYY = {'observationPeriod': 'P5Y'}
TEST_FACET_DATA_YYYY_MM = {
    'facet': "test",
    'obsCount': 20,
    'earliestDate': '2015-01',
    'latestDate': '2025-01'
}
TEST_FACET_METADATA_YYYY_MM = {'observationPeriod': 'P6M'}
TEST_SV_PLACE_FACETS = {
    'sv1': {
        'plk1': {
            'latestDate': '2020',
            'earliestDate': '2000',
            'observationPeriod': 'P5Y'
        },
        'plk2': {
            'latestDate': '2020-12',
            'earliestDate': '2019-01',
            'observationPeriod': 'P2M'
        }
    },
    'sv2': {
        'plk1': {
            'latestDate': '2018',
            'earliestDate': '2000',
            'observationPeriod': ''
        },
        'plk2': {
            'latestDate': '2022',
            'earliestDate': '2000',
            'observationPeriod': ''
        },
        'plk3': {
            'latestDate': '2022-01',
            'earliestDate': '2000-01',
            'observationPeriod': ''
        }
    }
}
TEST_SERIES_DATES_API_RESPONSE = {
    'datesByVariable': [{
        'variable':
            'sv1',
        'observationDates': [{
            'date': '2019',
            'entityCount': [
                {
                    'count': 2
                },
                {
                    'count': 10
                },
            ]
        }, {
            'date': '2020',
            'entityCount': [{
                'count': 11
            },]
        }, {
            'date': '2021',
            'entityCount': [{
                'count': 20
            },]
        }]
    }, {
        'variable':
            'sv2',
        'observationDates': [
            {
                'date': '2018-12',
                'entityCount': [{
                    'count': 2
                },]
            },
            {
                'date': '2019-06',
                'entityCount': [{
                    'count': 31
                },]
            },
            {
                'date': '2019-12',
                'entityCount': [{
                    'count': 15
                },]
            },
            {
                'date': '2020-06',
                'entityCount': [{
                    'count': 40
                },]
            },
        ]
    }, {
        'variable':
            'sv3',
        'observationDates': [{
            'date': '2015-12',
            'entityCount': [{
                'count': 50
            },]
        }, {
            'date': '2016-06',
            'entityCount': [{
                'count': 2
            },]
        }, {
            'date': '2016-12',
            'entityCount': [{
                'count': 2
            },]
        }, {
            'date': '2017-06',
            'entityCount': [{
                'count': 2
            },]
        }, {
            'date': '2017-12',
            'entityCount': [{
                'count': 2
            },]
        }, {
            'date': '2018-06',
            'entityCount': [{
                'count': 2
            },]
        }, {
            'date': '2018-12',
            'entityCount': [{
                'count': 2
            },]
        }, {
            'date': '2018',
            'entityCount': [{
                'count': 33
            },]
        }, {
            'date': '2019-06',
            'entityCount': [{
                'count': 1
            },]
        }, {
            'date': '2019-12',
            'entityCount': [{
                'count': 15
            },]
        }, {
            'date': '2019',
            'entityCount': [{
                'count': 32
            },]
        }]
    }]
}


class TestFacetContainsDate(unittest.TestCase):

  @parameterized.expand(
      [[
          Date(prep="", year=2020), None, TEST_FACET_DATA_YYYY,
          TEST_FACET_METADATA_YYYY, True
      ], [Date(prep="", year=2020), None, TEST_FACET_DATA_YYYY, {}, True],
       [
           Date(prep="", year=2012), None, TEST_FACET_DATA_YYYY,
           TEST_FACET_METADATA_YYYY, False
       ],
       [
           Date(prep="", year=2026), None, TEST_FACET_DATA_YYYY,
           TEST_FACET_METADATA_YYYY, False
       ],
       [
           Date(prep="", year=2021), None, TEST_FACET_DATA_YYYY,
           TEST_FACET_METADATA_YYYY, False
       ],
       [
           Date(prep="", year=2020), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           Date(prep="", year=2020, month=1), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           Date(prep="", year=2020, month=1), None, TEST_FACET_DATA_YYYY_MM, {},
           False
       ],
       [
           Date(prep="", year=2014, month=12), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           Date(prep="", year=2025, month=2), None, TEST_FACET_DATA_YYYY_MM,
           TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           None,
           Date(prep="before", year=2022, month=2, year_span=3),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="after", year=2024, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="until", year=2017, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="after", year=2013, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="before", year=2015, month=0, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           None,
           Date(prep="until", year=2015, month=0, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="after", year=2025, month=0, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           None,
           Date(prep="since", year=2025, month=0, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, True
       ],
       [
           None,
           Date(prep="before", year=2015, month=3, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY, True
       ],
       [
           None,
           Date(prep="before", year=2025, month=4, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY, True
       ],
       [
           None,
           Date(prep="until", year=2013, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, False
       ],
       [
           None,
           Date(prep="after", year=2026, month=2, year_span=0),
           TEST_FACET_DATA_YYYY_MM, TEST_FACET_METADATA_YYYY_MM, False
       ]])
  def test_main(self, single_date, date_range, facet_data, facet_metadata,
                expected):
    result = utils.facet_contains_date(facet_data, facet_metadata, single_date,
                                       date_range)
    self.assertEqual(result, expected)


class TestGetPredictedDate(unittest.TestCase):

  @parameterized.expand([[
      TEST_SV_PLACE_FACETS,
      Date(prep='before', year=2020, month=0, year_span=0), {
          'sv1': {
              'plk1': '2015',
              'plk2': '2019-12'
          },
          'sv2': {
              'plk1': '2018',
              'plk2': '2019'
          }
      }
  ],
                         [
                             TEST_SV_PLACE_FACETS,
                             Date(prep='before',
                                  year=2020,
                                  month=5,
                                  year_span=0), {
                                      'sv1': {
                                          'plk1': '2020',
                                          'plk2': '2020-04'
                                      },
                                      'sv2': {
                                          'plk1': '2018',
                                          'plk2': '2020'
                                      }
                                  }
                         ]])
  def test_main(self, sv_place_facet, date_range, expected):
    result = utils.get_predicted_latest_date(sv_place_facet, date_range)
    self.assertEqual(result, expected)


class TestGetContainedInLatestDate(unittest.TestCase):

  @parameterized.expand([[
      Date(prep='before', year=2020, month=0, year_span=0), {
          'sv1': {
              'p1County': '2019'
          },
          'sv2': {
              'p1County': '2019-06'
          },
          'sv3': {
              'p1County': '2018'
          }
      }
  ],
                         [
                             Date(prep='before',
                                  year=2020,
                                  month=7,
                                  year_span=0), {
                                      'sv1': {
                                          'p1County': '2020'
                                      },
                                      'sv2': {
                                          'p1County': '2020-06'
                                      },
                                      'sv3': {
                                          'p1County': '2018'
                                      }
                                  }
                         ]])
  @patch.object(util, 'get_series_dates_from_entities_within')
  def test_main(self, date_range, expected,
                mock_get_series_dates_from_entities_within):
    mock_get_series_dates_from_entities_within.return_value = TEST_SERIES_DATES_API_RESPONSE
    result = utils.get_contained_in_latest_date(['p1'],
                                                ContainedInPlaceType.COUNTY,
                                                ['sv1', 'sv2', 'sv3'],
                                                date_range)
    self.assertEqual(result, expected)
