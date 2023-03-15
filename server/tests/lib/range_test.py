# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import unittest

import server.lib.range as lib_range


class TestAggregate(unittest.TestCase):

  def test_us_age(self):
    input = {
        "country/USA": [
            "Count_Person_Upto4Years", "Count_Person_5To9Years",
            "Count_Person_10To14Years", "Count_Person_15To19Years",
            "Count_Person_20To24Years", "Count_Person_25To29Years",
            "Count_Person_30To34Years", "Count_Person_35To39Years",
            "Count_Person_40To44Years", "Count_Person_45To49Years",
            "Count_Person_50To54Years", "Count_Person_55To59Years",
            "Count_Person_60To64Years", "Count_Person_65To69Years",
            "Count_Person_70To74Years", "Count_Person_75To79Years",
            "Count_Person_80OrMoreYears", "Count_Person_5To17Years",
            "Count_Person_18To24Years", "Count_Person_25To34Years",
            "Count_Person_35To44Years", "Count_Person_45To54Years",
            "Count_Person_55To59Years", "Count_Person_60To61Years",
            "Count_Person_62To64Years", "Count_Person_65To74Years",
            "Count_Person_65OrMoreYears", "Count_Person_75OrMoreYears"
        ]
    }
    expected = {
        'country/USA': {
            'Count_Person_5To17Years': ['Count_Person_5To17Years'],
            'Count_Person_18To24Years': ['Count_Person_18To24Years'],
            'Count_Person_25To34Years': ['Count_Person_25To34Years'],
            'Count_Person_35To44Years': ['Count_Person_35To44Years'],
            'Count_Person_45To54Years': ['Count_Person_45To54Years'],
            'Count_Person_55To64Years': [
                'Count_Person_55To59Years', 'Count_Person_60To61Years',
                'Count_Person_62To64Years'
            ],
            'Count_Person_65To74Years': ['Count_Person_65To74Years'],
            'Count_Person_75OrMoreYears': ['Count_Person_75OrMoreYears']
        }
    }
    assert lib_range.aggregate_stat_var(input, lib_range.AGE) == expected

  def test_us_place_age(self):
    input = {
        "country/USA": [
            "Count_Person_Upto4Years",
            "Count_Person_5To9Years",
            "Count_Person_10To14Years",
            "Count_Person_15To19Years",
            "Count_Person_20To24Years",
            "Count_Person_25To29Years",
            "Count_Person_30To34Years",
            "Count_Person_35To39Years",
            "Count_Person_40To44Years",
            "Count_Person_45To49Years",
            "Count_Person_50To54Years",
            "Count_Person_55To59Years",
            "Count_Person_60To64Years",
            "Count_Person_65To69Years",
            "Count_Person_70To74Years",
            "Count_Person_75To79Years",
            "Count_Person_80OrMoreYears",
            "Count_Person_5To17Years",
            "Count_Person_18To24Years",
            "Count_Person_25To34Years",
            "Count_Person_35To44Years",
            "Count_Person_45To54Years",
            "Count_Person_55To59Years",
            "Count_Person_60To61Years",
            "Count_Person_62To64Years",
            "Count_Person_65To74Years",
            "Count_Person_65OrMoreYears",
            "Count_Person_75OrMoreYears",
            "Count_Person_5To17Years",
            "Count_Person_18To24Years",
            "Count_Person_25To34Years",
            "Count_Person_35To44Years",
            "Count_Person_45To54Years",
            "Count_Person_45To54Years",
            "Count_Person_55To64Years",
            "Count_Person_65To74Years",
        ],
        "geoId/12345": [
            "Count_Person_5To17Years",
            "Count_Person_18To24Years",
            "Count_Person_25To34Years",
            "Count_Person_35To44Years",
            "Count_Person_45To54Years",
            "Count_Person_55To59Years",
            "Count_Person_60To61Years",
            "Count_Person_62To64Years",
            "Count_Person_65To74Years",
        ]
    }
    expected = {
        'country/USA': {
            'Count_Person_5To17Years': ['Count_Person_5To17Years'],
            'Count_Person_18To24Years': ['Count_Person_18To24Years'],
            'Count_Person_25To34Years': ['Count_Person_25To34Years'],
            'Count_Person_35To44Years': ['Count_Person_35To44Years'],
            'Count_Person_45To54Years': ['Count_Person_45To54Years'],
            'Count_Person_55To64Years': [
                'Count_Person_55To59Years', 'Count_Person_60To61Years',
                'Count_Person_62To64Years'
            ],
            'Count_Person_65To74Years': ['Count_Person_65To74Years'],
            'Count_Person_75OrMoreYears': ['Count_Person_75OrMoreYears']
        },
        'geoId/12345': {
            'Count_Person_5To17Years': ['Count_Person_5To17Years'],
            'Count_Person_18To24Years': ['Count_Person_18To24Years'],
            'Count_Person_25To34Years': ['Count_Person_25To34Years'],
            'Count_Person_35To44Years': ['Count_Person_35To44Years'],
            'Count_Person_45To54Years': ['Count_Person_45To54Years'],
            'Count_Person_55To64Years': [
                'Count_Person_55To59Years', 'Count_Person_60To61Years',
                'Count_Person_62To64Years'
            ],
            'Count_Person_65To74Years': ['Count_Person_65To74Years']
        }
    }
    assert lib_range.aggregate_stat_var(input, lib_range.AGE) == expected

  def test_eu_place_age(self):
    input = {
        "country/FRA": [
            "Count_Person_Upto4Years",
            "Count_Person_5To9Years",
            "Count_Person_10To14Years",
            "Count_Person_15To19Years",
            "Count_Person_20To24Years",
            "Count_Person_25To29Years",
            "Count_Person_30To34Years",
            "Count_Person_35To39Years",
            "Count_Person_40To44Years",
            "Count_Person_45To49Years",
            "Count_Person_50To54Years",
            "Count_Person_55To59Years",
            "Count_Person_60To64Years",
            "Count_Person_65To69Years",
            "Count_Person_70To74Years",
            "Count_Person_75To79Years",
            "Count_Person_80OrMoreYears",
            "Count_Person_5To17Years",
            "Count_Person_18To24Years",
            "Count_Person_25To34Years",
            "Count_Person_35To44Years",
            "Count_Person_45To54Years",
            "Count_Person_55To59Years",
            "Count_Person_60To61Years",
            "Count_Person_62To64Years",
            "Count_Person_65To74Years",
            "Count_Person_65OrMoreYears",
            "Count_Person_75OrMoreYears",
            "Count_Person_5To17Years",
            "Count_Person_18To24Years",
            "Count_Person_25To34Years",
            "Count_Person_35To44Years",
            "Count_Person_45To54Years",
            "Count_Person_45To54Years",
            "Count_Person_55To64Years",
            "Count_Person_65To74Years",
        ],
        "country/ITA": [
            "Count_Person_Upto4Years",
            "Count_Person_5To9Years",
            "Count_Person_10To14Years",
            "Count_Person_15To19Years",
            "Count_Person_20To24Years",
            "Count_Person_25To29Years",
            "Count_Person_30To34Years",
            "Count_Person_35To39Years",
            "Count_Person_40To44Years",
            "Count_Person_45To49Years",
            "Count_Person_50To54Years",
            "Count_Person_55To59Years",
            "Count_Person_60To64Years",
            "Count_Person_65To69Years",
        ]
    }
    expected = {
        'country/FRA': {
            'Count_Person_Upto9Years': [
                'Count_Person_5To9Years',
                'Count_Person_Upto4Years',
            ],
            'Count_Person_10To19Years': [
                'Count_Person_10To14Years',
                'Count_Person_15To19Years',
            ],
            'Count_Person_20To29Years': [
                'Count_Person_20To24Years',
                'Count_Person_25To29Years',
            ],
            'Count_Person_30To39Years': [
                'Count_Person_30To34Years',
                'Count_Person_35To39Years',
            ],
            'Count_Person_40To49Years': [
                'Count_Person_40To44Years', 'Count_Person_45To49Years'
            ],
            'Count_Person_50To59Years': [
                'Count_Person_50To54Years',
                'Count_Person_55To59Years',
            ],
            'Count_Person_60To69Years': [
                'Count_Person_60To64Years',
                'Count_Person_65To69Years',
            ],
            'Count_Person_70OrMoreYears': [
                'Count_Person_70To74Years', 'Count_Person_75To79Years',
                'Count_Person_80OrMoreYears'
            ]
        },
        'country/ITA': {
            'Count_Person_Upto9Years': [
                'Count_Person_5To9Years', 'Count_Person_Upto4Years'
            ],
            'Count_Person_10To19Years': [
                'Count_Person_10To14Years', 'Count_Person_15To19Years'
            ],
            'Count_Person_20To29Years': [
                'Count_Person_20To24Years', 'Count_Person_25To29Years'
            ],
            'Count_Person_30To39Years': [
                'Count_Person_30To34Years', 'Count_Person_35To39Years'
            ],
            'Count_Person_40To49Years': [
                'Count_Person_40To44Years', 'Count_Person_45To49Years'
            ],
            'Count_Person_50To59Years': [
                'Count_Person_50To54Years', 'Count_Person_55To59Years'
            ],
            'Count_Person_60To69Years': [
                'Count_Person_60To64Years', 'Count_Person_65To69Years'
            ]
        }
    }
    assert lib_range.aggregate_stat_var(input, lib_range.AGE) == expected
