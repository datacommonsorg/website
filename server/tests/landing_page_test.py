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

import unittest
import json
import routes.api.landing_page as landing_page

from flask import Flask, request, g
from flask_babel import Babel

# TODO(shifucun): add test for api endpoint.


class TestBuildSpec(unittest.TestCase):

    def setUp(self):
        app = Flask(__name__)
        Babel(app, default_domain='all')
        app.config['BABEL_DEFAULT_LOCALE'] = 'en'
        app.config['BABEL_TRANSLATION_DIRECTORIES'] = '../l10n'
        self.context = app.test_request_context('/')

    def test_chart_config_transform(self):
        chart_config = [{
            'category': 'Economics',
            'titleId': 'CHART_TITLE-Unemployment_rate',
            'title': 'Unemployment Rate',
            'statsVars': ['UnemploymentRate_Person'],
            'isOverview': True
        }, {
            'category': 'Economics',
            'titleId': 'CHART_TITLE-Labor_force',
            'title': 'Labor Force',
            'statsVars': ['Count_Person_InLaborForce'],
            'scaling': 100,
            'unit': '%',
        }, {
            'category': 'Economics',
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
            result, stat_vars = landing_page.build_spec(chart_config)
            with open('tests/test_data/golden_config.json') as f:
                expected = json.load(f)
                assert expected == result
                assert [
                    'UnemploymentRate_Person', 'Count_Person_InLaborForce',
                    'Count_Person_Employed', 'Count_Person'
                ] == stat_vars
