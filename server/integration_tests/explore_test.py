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

import json
import os

import requests

from shared.lib.test_server import NLWebServerTestCase

_dir = os.path.dirname(os.path.abspath(__file__))

_TEST_MODE = os.environ['TEST_MODE']

_TEST_DATA = 'test_data'


class ExploreTest(NLWebServerTestCase):

  def run_fulfillment(self,
                      test_dir,
                      req_json,
                      failure='',
                      test='',
                      i18n='',
                      udp=''):
    resp = requests.post(
        self.get_server_url() +
        f'/api/explore/fulfill?test={test}&i18n={i18n}&udp={udp}',
        json=req_json).json()
    self.handle_response(json.dumps(req_json), resp, test_dir, '', failure)

  def run_detection(self,
                    test_dir,
                    queries,
                    dc='',
                    failure='',
                    test='',
                    i18n=''):
    ctx = {}
    for q in queries:
      resp = requests.post(self.get_server_url() +
                           f'/api/explore/detect?q={q}&test={test}&i18n={i18n}',
                           json={
                               'contextHistory': ctx,
                               'dc': dc,
                           }).json()
      ctx = resp['context']
      if len(queries) == 1:
        d = ''
      else:
        d = q.replace(' ', '').replace('?', '').lower()
      self.handle_response(q, resp, test_dir, d, failure)

  def run_detect_and_fulfill(self,
                             test_dir,
                             queries,
                             dc='',
                             failure='',
                             test='',
                             i18n='',
                             udp=''):
    ctx = {}
    for (index, q) in enumerate(queries):
      resp = requests.post(
          self.get_server_url() +
          f'/api/explore/detect-and-fulfill?q={q}&test={test}&i18n={i18n}&udp={udp}',
          json={
              'contextHistory': ctx,
              'dc': dc,
          }).json()
      ctx = resp['context']
      if len(queries) == 1:
        d = ''
      else:
        d = q.replace(' ', '').replace('?', '').lower()
        # For some queries like Chinese, no characters are replaced and leads to unwieldy folder names.
        # Use the query index for such cases.
        if d == q and i18n:
          d = f"query_{index + 1}"
      self.handle_response(d, resp, test_dir, d, failure)

  def handle_response(self,
                      query,
                      resp,
                      test_dir,
                      test_name,
                      failure,
                      check_place_detection=False,
                      detector=None):
    dbg = resp['debug']
    resp['debug'] = {}
    resp['context'] = {}
    json_file = os.path.join(_dir, _TEST_DATA, test_dir, test_name,
                             'chart_config.json')
    if _TEST_MODE == 'write':
      json_dir = os.path.dirname(json_file)
      if not os.path.isdir(json_dir):
        os.makedirs(json_dir)
      with open(json_file, 'w') as infile:
        infile.write(json.dumps(resp, indent=2))

      if check_place_detection:
        dbg_file = os.path.join(json_dir, 'debug_info.json')
        with open(dbg_file, 'w') as infile:
          dbg_to_write = {
              "places_detected": dbg["places_detected"],
              "places_resolved": dbg["places_resolved"],
              "main_place_dcid": dbg["main_place_dcid"],
              "main_place_name": dbg["main_place_name"]
          }
          infile.write(json.dumps(dbg_to_write, indent=2))
    else:
      if failure:
        self.assertTrue(failure in resp["failure"]), resp["failure"]
        self.assertTrue(not resp["config"])
        return

      if detector:
        self.assertTrue(dbg.get('detection_type').startswith(detector)), \
          f'Query {query} failed!'
      if not check_place_detection:
        with open(json_file, 'r') as infile:
          expected = json.load(infile)
          expected['debug'] = {}
          expected['context'] = {}
          a, b = (
              json.dumps(resp, sort_keys=True, indent=2),
              json.dumps(expected, sort_keys=True, indent=2),
          )
          self.maxDiff = None
          self.assertEqual(a, b)
      else:
        # Look in the debugInfo file to match places detected.
        dbg_file = os.path.join(_dir, _TEST_DATA, test_dir, test_name,
                                'debug_info.json')
        with open(dbg_file, 'r') as infile:
          expected = json.load(infile)
          self.assertEqual(dbg["places_detected"], expected["places_detected"])
          self.assertEqual(dbg["places_resolved"], expected["places_resolved"])
          self.assertEqual(dbg["main_place_dcid"], expected["main_place_dcid"])
          self.assertEqual(dbg["main_place_name"], expected["main_place_name"])

  def test_detection_basic(self):
    self.run_detection('detection_api_basic', ['Commute in California'],
                       test='unittest')

  def test_detection_sdg(self):
    self.run_detection('detection_api_sdg', ['Health in USA'], dc='sdg')

  def test_detection_context(self):
    self.run_detection('detection_api_context', [
        'States with highest PHDs', 'Commute in tracts of California',
        'Compare with Nevada', 'Correlate with asthma',
        'countries with greenhouse gas emissions',
        'median income in Santa Clara county and Alameda county'
    ])

  def test_detection_statvars(self):
    self.run_detection('detection_api_statvars', [
        'Income in information industry in nevada',
        'Correlate with GDP of California'
    ])

  def test_detection_translate(self):
    # Chinese query for "which cities in the Santa Clara County have the highest larceny?"
    self.run_detection('detection_translate_chinese', ['圣克拉拉县哪些城市的盗窃率最高？'],
                       i18n='true')

  def test_fulfillment_basic(self):
    req = {
        'entities': ['geoId/06085'],
        'variables': ['dc/topic/WorkCommute'],
        'dc': '',
        'disableExploreMore': '1',
    }
    self.run_fulfillment('fulfillment_api_basic', req, test='unittest')

  def test_fulfillment_explore_more(self):
    req = {
        'entities': ['geoId/06085'],
        'variables': ['dc/topic/DivorcedPopulationByDemographic'],
        'dc': '',
    }
    self.run_fulfillment('fulfillment_api_explore_more', req)

  def test_fulfillment_sdg(self):
    req = {
        'entities': ['country/USA'],
        'variables': ['dc/topic/sdg_1'],
        'dc': 'sdg'
    }
    self.run_fulfillment('fulfillment_api_sdg', req)

  def test_fulfillment_sdg_global(self):
    req = {
        'entities': ['Earth'],
        'variables': ['dc/topic/sdg_2.2.1'],
        'dc': 'sdg'
    }
    self.run_fulfillment('fulfillment_api_sdg_global', req)

  def test_fulfillment_sdg_global(self):
    req = {
        'entities': ['CentralAsia'],
        'variables': ['dc/topic/sdg_2.2.1'],
        'dc': 'sdg'
    }
    self.run_fulfillment('fulfillment_api_sdg_centralasia', req)

  def test_fulfillment_sdg_specialvars(self):
    req = {
        'entities': ['country/USA'],
        'variables': ['dc/topic/sdg_17.19.2'],
        'dc': 'sdg'
    }
    self.run_fulfillment('fulfillment_api_sdg_specialvars', req)

  def test_fulfillment_sdg_global_specialvars(self):
    req = {
        'entities': ['Earth'],
        'variables': ['dc/topic/sdg_17.19.2'],
        'dc': 'sdg'
    }
    self.run_fulfillment('fulfillment_api_sdg_global_specialvars', req)

  def test_fulfillment_comparison(self):
    req = {
        'entities': ['geoId/06'],
        'variables': ['dc/topic/WorkCommute'],
        'childEntityType': 'County',
        'comparisonEntities': ['geoId/32'],
    }
    self.run_fulfillment('fulfillment_api_comparison', req)

  def test_fulfillment_correlation(self):
    req = {
        'entities': ['geoId/06'],
        'variables': ['dc/topic/WorkCommute'],
        'comparisonVariables': ['dc/topic/Asthma'],
        'childEntityType': 'County',
    }
    self.run_fulfillment('fulfillment_api_correlation', req)

  def test_fulfillment_statvars(self):
    req = {
        'variables': [
            'ReceiptsOrRevenue_Establishment_NAICSInformation_WithPayroll',
            'dc/xj2nk2bg60fg',
            'Amount_EconomicActivity_GrossDomesticProduction_NAICSInformation_RealValue',
            'WagesTotal_Worker_NAICSInformation',
            'USStateQuarterlyIndustryGDP_NAICS_51',
            'WagesAnnual_Establishment_NAICSInformation'
        ],
        'entities': ['geoId/06']
    }
    self.run_fulfillment('fulfillment_api_statvars', req)

  def test_fulfillment_nl_size(self):
    # How big are schools in Redwood city
    # -> this query returns 3 ranking tables, not supported
    #    on old Explore backend.
    req = {
        "entities": ["geoId/0660102"],
        "variables": ["dc/topic/Schools", "Count_Person_EnrolledInSchool"],
        'childEntityType':
            'PublicSchool',
        "comparisonVariables": [],
        "classifications": [
            {
                "contained_in_place_type": "PublicSchool",
                "type": 4
            },
            {
                "superlatives": [1],
                "type": 11
            },
        ],
    }
    self.run_fulfillment('fulfillment_api_nl_size', req)

  def test_e2e_answer_places(self):
    self.run_detect_and_fulfill('e2e_answer_places', [
        'California counties with the highest asthma levels',
        'What is the obesity rate in these counties?',
        'How about the uninsured population?',
        'Which counties in california have median age over 40?',
        'What is the emissions in these counties?'
    ])

  def test_e2e_electrification_demo(self):
    self.run_detect_and_fulfill('e2e_electrification_demo', [
        'Which countries in Africa have had the greatest increase in electricity access?',
        'How has poverty reduced in these places?',
        'How has the GDP grown?',
        'What is the greenhouse gas emissions from these places?',
        'How do these countries compare with the US and Germany?',
    ])

  def test_e2e_india_demo(self):
    self.run_detect_and_fulfill('e2e_india_demo', [
        'Which states in India have the highest poverty levels per capita?',
        'How much has infant mortality changed over time in these states?',
        'How does the literacy rate compare?',
        'How does literacy rate compare to poverty in India?',
    ])

  def test_e2e_us_demo(self):
    self.run_detect_and_fulfill('e2e_us_demo', [
        'Which counties in the US have the highest levels of diabetes?',
        'What is the demographic breakdown of East Carroll Parish, LA?',
        'What is the median household income in East Carroll Parish, LA?',
        'How does household income compare with rates of diabetes in USA counties?',
        'How do obesity rates compare with rates of diabetes in USA counties?',
    ])

  def test_e2e_edge_cases(self):
    self.run_detect_and_fulfill('e2e_edge_cases', [
        'emissions in Houston', 'poverty in California and California',
        'poverty vs. poverty in California',
        'number of headless drivers in california',
        'immunization vs. debt in the world', 'debt in china, germany and india'
    ])

  def test_e2e_edge_cases2(self):
    self.run_detect_and_fulfill('e2e_edge_cases2', [
        'What crimes are considered felonies vs. misdemeanors in the US',
        'How does school size of urban schools compare to rural schools in US',
        'What is the relationship between housing size and home prices in California',
    ])

  def test_e2e_superlatives(self):
    self.run_detect_and_fulfill('e2e_superlatives', [
        'Richest counties in california',
        'List schools in Sunnyvale',
    ],
                                test='unittest')

  def test_e2e_translate(self):
    # Chinese queries for:
    # - "which cities in the Santa Clara County have the highest larceny?"
    # - "what about car theft?"
    self.run_detect_and_fulfill('e2e_translate_chinese',
                                ['圣克拉拉县哪些城市的盗窃率最高？', '汽车被盗怎么办？'],
                                i18n='true')

  def test_e2e_sdg(self):
    self.run_detect_and_fulfill('e2e_sdg', [
        'Hunger in Nigeria',
        'Compare progress on poverty in Mexico, Nigeria and Pakistan'
    ],
                                dc='sdg')

  def test_e2e_fallbacks(self):
    self.run_detect_and_fulfill(
        'e2e_fallbacks',
        [
            # There is NO county-level data at all, so this
            # should fallback to US states.
            'Life expectancy in US counties',
            # There is county-level data further down in the
            # chart list, so it should also fallback to states.
            'Tamil speakers in US counties',
            # This should fallback from tract to city.
            'auto thefts in tracts of sunnyvale',
            # This should fallback from child-type (tract)
            # to the place (SC county) to its state (CA).
            'auto thefts in tracts of santa clara county'
        ])

  def test_e2e_default_place(self):
    self.run_detect_and_fulfill('e2e_default_place', [
        'what does a diet for diabetes look like?',
        'how to earn money online without investment'
    ],
                                udp='false')