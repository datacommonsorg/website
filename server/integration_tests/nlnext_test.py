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


class IntegrationTest(NLWebServerTestCase):

  # TODO: Validate contexts as well eventually.
  def run_sequence(self,
                   test_dir,
                   queries,
                   idx='medium_ft',
                   detector='hybrid',
                   check_place_detection=False,
                   expected_detectors=[],
                   place_detector='ner',
                   failure=''):
    if detector == 'heuristic':
      detection_method = 'Heuristic Based'
    elif detector == 'llm':
      detection_method = 'LLM Based'
    elif detector == 'hybrid':
      detection_method = 'Hybrid - Heuristic Based'
    ctx = {}
    for i, q in enumerate(queries):
      print('Issuing ', test_dir, f'query[{i}]', q)
      resp = requests.post(
          self.get_server_url() +
          f'/api/nl/data?q={q}&idx={idx}&detector={detector}&place_detector={place_detector}',
          json={
              'contextHistory': ctx
          }).json()

      ctx = resp['context']
      dbg = resp['debug']
      resp['debug'] = {}
      resp['context'] = {}
      json_file = os.path.join(_dir, _TEST_DATA, test_dir, f'query_{i + 1}',
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

        if not expected_detectors:
          self.assertTrue(dbg.get('detection_type').startswith(detection_method)), \
            'Query {q} failed!'
        else:
          self.assertTrue(dbg.get('detection_type').startswith(expected_detectors[i])), \
            'Query {q} failed!'
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
          dbg_file = os.path.join(_dir, _TEST_DATA, test_dir, f'query_{i + 1}',
                                  'debug_info.json')
          with open(dbg_file, 'r') as infile:
            expected = json.load(infile)
            self.assertEqual(dbg["places_detected"],
                             expected["places_detected"])
            self.assertEqual(dbg["places_resolved"],
                             expected["places_resolved"])
            self.assertEqual(dbg["main_place_dcid"],
                             expected["main_place_dcid"])
            self.assertEqual(dbg["main_place_name"],
                             expected["main_place_name"])

  def test_textbox_sample(self):
    # This is the sample advertised in our textbox
    self.run_sequence('textbox_sample', ['family earnings in california'])

  def test_textbox_sample_llm(self):
    # This is the sample advertised in our textbox
    self.run_sequence('textbox_sample_llm', ['family earnings in california'],
                      detector='llm')

  def test_demo_feb2023(self):
    self.run_sequence('demo_feb2023', [
        'What are the projected temperature extremes across California',
        'Where were the major fires in the last year',
        'Tell me about Placer County',
        'What were the most common jobs there',
        'Which jobs have grown the most',
        'What are the most common health issues there',
        'Which counties in california have the highest levels of blood pressure',
        'Which counties in the USA have the highest levels of blood pressure',
        'How does this correlate with income',
        'What is the meaning of life',
    ])

  def test_demo_cities_feb2023(self):
    self.run_sequence(
        'demo2_cities_feb2023',
        [
            # This should list public school entities.
            'How big are the public schools in Sunnyvale',
            'What is the prevalence of asthma there',
            'What is the commute pattern there',
            'How does that compare with San Bruno',
            # Proxy for parks in magiceye
            'Which cities in the SF Bay Area have the highest larceny',
            'What countries in Africa had the greatest increase in life expectancy',
            # This should list stats about the middle school students.
            'How many middle schools are there in Sunnyvale',
        ])

  def test_demo_fallback(self):
    self.run_sequence(
        'demo_fallback',
        [
            # We have no stats on this, so we should return SF overview.
            # Two places should be detected but San Francisco is the main place.
            'Number of Shakespeare fans in San Francisco and Chicago.',
            # We should support comparison across multiple places in a single query.
            # Since there are multiple places we shouldn't need the trigger word "compare".
            'Crime in California and Florida',
            # We have no crime at county-level in CA, so we should fall back as:
            # RANKING_ACROSS_PLACES -> CONTAINED_IN -> SIMPLE
            'counties in California with highest crime',
            # We have no obesity data at State-level. Instead we should fallback to
            # parent place USA.
            'obesity in California',
            # We should fail fulfilling "Country" type contained-in a country,
            # instead we would pick contained-in from context (County).
            'GDP of countries in the US',
        ],
        detector='hybrid',
        expected_detectors=[
            'Hybrid - LLM Fallback',
            'Hybrid - Heuristic Based',
            'Hybrid - Heuristic Based',
            'Hybrid - Heuristic Based',
            'Hybrid - Heuristic Based',
        ])

  def test_demo_multisv(self):
    self.run_sequence(
        'multisv',
        [
            # We support comparison with multiple stat-vars. This should be
            # a correlation chart for counties in CA.
            "Poverty vs. Obesity in California",
            # This should be a place comparison for a single more prominent SV.
            "Poverty vs. Obesity in California and Florida",
            # Filter query with top cities.
            "California cities with hispanic population over 10000",
            # Filter query with another SV.
            "Prevalence of Asthma in California cities with hispanic population over 10000",
        ],
        # Use heuristic because LLM fallback is not very deterministic.
        detector='heuristic')

  def test_demo_climatetrace(self):
    self.run_sequence('demo_climatetrace',
                      ['Which countries emit the most greenhouse gases?'])

  # # This test uses NER.
  def test_place_detection_e2e_ner(self):
    self.run_sequence('place_detection_e2e', [
        'tell me about palo alto',
        'US states which have that the cheapest houses',
        'what about in florida',
        'compare with california and new york state and washington state',
        'show me the population of mexico city',
        'counties in the US with the most poverty',
    ],
                      check_place_detection=True)

  # This test uses DC's Recognize Places API.
  # TODO: "US" is not detected by RecognizePlaces.
  # TODO: Also "mexico city" is wrongly detected.
  def test_place_detection_e2e_dc(self):
    self.run_sequence('place_detection_e2e_dc', [
        'tell me about palo alto',
        'US states which have that the cheapest houses',
        'what about in florida',
        'compare with california and new york state and washington state',
        'show me the population of mexico city',
        'counties in the US with the most poverty',
    ],
                      check_place_detection=True,
                      place_detector='dc')

  def test_international(self):
    self.run_sequence('international', [
        'Where are the most rural districts in India',
        'Life expectancy across provinces of China',
        'GDP of counties in the United Kingdom',
        'Districts in Turkey with the highest fertility rate',
        'Floods in Brazil',
        'Drought in Africa',
    ])

  def test_demo_usa_map_types(self):
    self.run_sequence(
        'usa_map_types',
        [
            # This should show ranking and map.
            'which cities in the Santa Clara County have the highest larceny?',
            # Shows map of tracts.
            'household median income across tracts of Placer County',
            # Shows map of ZCTAs.
            'how many people are unemployed in zip codes of washington state?'
        ])

  def test_sdg(self):
    self.run_sequence('sdg', [
        'tell me about poverty in africa',
        'which countries have show the greatest reduction?',
        'health in the world',
    ])

  def test_medium_index(self):
    self.run_sequence('medium_index',
                      ['cars per family in california counties'],
                      idx='medium')

  def test_inappropriate_query(self):
    self.run_sequence('inappropriate_query',
                      ['how many wise asses live in sunnyvale?'],
                      idx='medium',
                      failure='inappropriate words')
