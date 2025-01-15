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

from flask import Flask
from flask_babel import Babel

import server.lib.util as libutil
import server.routes.place.api as api
from web_app import app

# TODO(shifucun): add test for api endpoint.


class TestBuildSpec(unittest.TestCase):

  def setUp(self):
    app = Flask(__name__)
    Babel(app, default_domain='all')
    app.config['BABEL_DEFAULT_LOCALE'] = 'en'
    app.config['BABEL_TRANSLATION_DIRECTORIES'] = '../../../i18n'
    self.context = app.test_request_context('/')

  def test_chart_config_transform(self):
    chart_config = [{
        'category': 'Economics',
        'topic': 'Employment',
        'titleId': 'CHART_TITLE-Unemployment_rate',
        'title': 'Unemployment Rate',
        'statsVars': ['UnemploymentRate_Person'],
        'isOverview': True
    }, {
        'category': 'Economics',
        'topic': 'Employment',
        'titleId': 'CHART_TITLE-Labor_force',
        'title': 'Labor Force',
        'statsVars': ['Count_Person_InLaborForce'],
        'scaling': 100,
        'unit': '%',
    }, {
        'category': 'Economics',
        'topic': 'Employment',
        'titleId': 'CHART_TITLE-Total_employed',
        'title': 'Number of people employed',
        'description': 'Number of people employed',
        'statsVars': ['Count_Person_Employed'],
        'relatedChart': {
            'titleId': 'CHART_TITLE-Percentage_employed',
            'title': 'Percentage of people employed',
            'description': 'Percentage of people employed',
            'scale': True,
            'denominator': 'Count_Person',
            'scaling': 100,
            'unit': '%'
        }
    }]
    with self.context:
      result = api.build_spec(chart_config, target_category="Overview")
      with open('server/tests/test_data/golden_config.json') as f:
        expected = json.load(f)
        assert expected == result

  def test_menu_hierarchy(self):
    # Only return the legacy charts from this. Place page revamp charts have a different format.
    chart_config = libutil.get_chart_config()
    chart_config = [c for c in chart_config if 'statsVars' in c]

    spec = api.build_spec(chart_config, "Overview", False)
    got = {}
    for category, topic_data in spec.items():
      got[category] = {}
      for topic, configs in topic_data.items():
        got[category][topic] = [c['title'] for c in configs]
    # Get expected text
    with open('server/tests/test_data/golden_menu_text.json',
              encoding='utf-8') as f:
      expect = json.load(f)
      self.assertEqual(got, expect)


class TestI18n(unittest.TestCase):

  def setUp(self):
    app = Flask(__name__)
    Babel(app, default_domain='all')
    app.config['BABEL_DEFAULT_LOCALE'] = 'en'
    app.config['BABEL_TRANSLATION_DIRECTORIES'] = '../i18n'
    # TODO(beets): Change language codes in this test back to zh once
    # that's added to the AVAILABLE_LANGUAGES
    self.context = app.test_request_context(
        '/api/landingpage/data/geoId/06?hl=ru')

  @staticmethod
  def side_effect(dcids, prop):
    return {
        "geoId/0646870": ["门洛帕克@ru"],
        "geoId/0651840": ["北費爾奧克斯 (加利福尼亞州)@ru", "North Fair Oaks@en"],
        "geoId/0684536": []
    }

  @patch('server.routes.shared_api.place.fetch.property_values')
  def test_child_places_i18n(self, mock_property_values):
    mock_property_values.side_effect = self.side_effect

    raw_page_data = {
        "allChildPlaces": {
            "City": {
                "places": [{
                    "dcid": "geoId/0646870",
                    "name": "Menlo Park",
                    "pop": 34549
                }, {
                    "dcid": "geoId/0651840",
                    "name": "North Fair Oaks",
                    "pop": 14372
                }, {
                    "dcid": "geoId/0684536",
                    "name": "West Menlo Park",
                    "pop": 4160
                }]
            },
        },
    }

    expected = {
        "City": [{
            "dcid": "geoId/0646870",
            "name": "门洛帕克",
            "pop": 34549
        }, {
            "dcid": "geoId/0651840",
            "name": "北費爾奧克斯 (加利福尼亞州)",
            "pop": 14372
        }, {
            "dcid": "geoId/0684536",
            "name": "West Menlo Park",
            "pop": 4160
        }]
    }

    with self.context:
      app.preprocess_request()
      all_child_places = api.get_i18n_all_child_places(raw_page_data)
      assert expected == all_child_places
