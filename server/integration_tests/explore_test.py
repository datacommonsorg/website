# Copyright 2024 Google LLC
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
import re

from langdetect import detect as detect_lang
import requests

from shared.lib.test_server import NLWebServerTestCase

_dir = os.path.dirname(os.path.abspath(__file__))

_TEST_MODE = os.environ['TEST_MODE']

_TEST_DATA = 'test_data'

_MAX_FOOTNOTE_LENGTH = 500


class ExploreTest(NLWebServerTestCase):

  def run_fulfillment(self, test_dir, req_json, failure='', test='', i18n=''):
    resp = requests.post(
        self.get_server_url() +
        f'/api/explore/fulfill?test={test}&i18n={i18n}&client=test_fulfill',
        json=req_json).json()
    self.handle_response(json.dumps(req_json), resp, test_dir, '', failure)

  def run_detection(self,
                    test_dir,
                    queries,
                    dc='',
                    failure='',
                    test='',
                    i18n='',
                    check_detection=False,
                    idx='',
                    reranker=''):
    ctx = {}
    for q in queries:
      resp = requests.post(
          self.get_server_url() +
          f'/api/explore/detect?q={q}&test={test}&i18n={i18n}&client=test_detect&idx={idx}&reranker={reranker}',
          json={
              'contextHistory': ctx,
              'dc': dc,
          }).json()
      ctx = resp['context']
      if len(queries) == 1:
        d = ''
      else:
        d = re.sub(r'[ ?"]', '', q).lower()
      print(d)
      self.handle_response(q, resp, test_dir, d, failure, check_detection)

  def run_detect_and_fulfill(self,
                             test_dir,
                             queries,
                             dc='',
                             failure='',
                             test='',
                             i18n='',
                             i18n_lang='',
                             mode='',
                             default_place='',
                             idx=''):
    ctx = []
    for (index, q) in enumerate(queries):
      resp = requests.post(
          self.get_server_url() +
          f'/api/explore/detect-and-fulfill?q={q}&test={test}&i18n={i18n}&mode={mode}&client=test_detect-and-fulfill&default_place={default_place}&idx={idx}',
          json={
              'contextHistory': ctx,
              'dc': dc,
          }).json()
      ctx = resp['context']
      if len(queries) == 1:
        d = ''
      else:
        d = re.sub(r'[ ?"]', '', q).lower()
        # For some queries like Chinese, no characters are replaced and leads to unwieldy folder names.
        # Use the query index for such cases.
        if d == q and i18n:
          d = f"query_{index + 1}"

      if i18n and i18n_lang:
        self.handle_i18n_response(resp, i18n_lang)
        return

      self.handle_response(d, resp, test_dir, d, failure)

  def handle_response(self,
                      query,
                      resp,
                      test_dir,
                      test_name,
                      failure,
                      check_detection=False,
                      detector=None):
    dbg = resp['debug']

    # sort variables in the response because variable scores can change between
    # runs. Sort by scores cut off after 6 digits after the decimal and for
    # variables with the same truncated score, sort alphabetically
    resp_var_to_score = {}
    for i, sv in enumerate(dbg['sv_matching']['SV']):
      score = dbg['sv_matching']['CosineScore'][i]
      resp_var_to_score[sv] = float("{:.6f}".format(score))
    if 'variables' in resp:
      sorted_variables = sorted(resp['variables'],
                                key=lambda x: (-resp_var_to_score[x], x))
      resp['variables'] = sorted_variables

    resp['debug'] = {}
    resp['context'] = {}
    for category in resp.get('config', {}).get('categories', []):
      for block in category.get('blocks'):
        block_footnote = block.get('footnote', '')
        if len(block_footnote) > _MAX_FOOTNOTE_LENGTH:
          block[
              'footnote'] = f'{block_footnote[:_MAX_FOOTNOTE_LENGTH:]}...{len(block_footnote) - _MAX_FOOTNOTE_LENGTH} more chars'
    json_file = os.path.join(_dir, _TEST_DATA, test_dir, test_name,
                             'chart_config.json')
    if _TEST_MODE == 'write':
      json_dir = os.path.dirname(json_file)
      if not os.path.isdir(json_dir):
        os.makedirs(json_dir)
      if check_detection:
        dbg_file = os.path.join(json_dir, 'debug_info.json')
        with open(dbg_file, 'w') as infile:
          del dbg["sv_matching"]["SV_to_Sentences"]
          del dbg["props_matching"]["PROP_to_Sentences"]
          dbg_to_write = {
              "places_detected": dbg["places_detected"],
              "places_resolved": dbg["places_resolved"],
              "main_place_dcid": dbg["main_place_dcid"],
              "main_place_name": dbg["main_place_name"],
              "entities_detected": dbg["entities_detected"],
              "entities_resolved": dbg["entities_resolved"],
              "query_with_places_removed": dbg["query_with_places_removed"],
              "sv_matching": dbg["sv_matching"],
              "props_matching": dbg["props_matching"],
              "query_detection_debug_logs": dbg["query_detection_debug_logs"],
          }
          infile.write(json.dumps(dbg_to_write, indent=2))
      else:
        with open(json_file, 'w') as infile:
          infile.write(json.dumps(resp, indent=2))
    else:
      if failure:
        self.assertTrue(failure in resp["failure"]), resp["failure"]
        self.assertTrue(not resp["config"])
        return

      if detector:
        self.assertTrue(dbg.get('detection_type').startswith(detector)), \
          f'Query {query} failed!'
      if not check_detection:
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
        # Look in the debugInfo file to match things detected.
        dbg_file = os.path.join(_dir, _TEST_DATA, test_dir, test_name,
                                'debug_info.json')
        with open(dbg_file, 'r') as infile:
          expected = json.load(infile)
          self.assertEqual(dbg["places_detected"], expected["places_detected"])
          self.assertEqual(dbg["places_resolved"], expected["places_resolved"])
          self.assertEqual(dbg["main_place_dcid"], expected["main_place_dcid"])
          self.assertEqual(dbg["main_place_name"], expected["main_place_name"])
          self.assertEqual(dbg["entities_resolved"],
                           expected["entities_resolved"])
          self.assertEqual(dbg["sv_matching"]["SV"],
                           expected["sv_matching"]["SV"])
          self.assertEqual(dbg["query_detection_debug_logs"],
                           expected["query_detection_debug_logs"])
          self.assertEqual(dbg["props_matching"]["PROP"],
                           expected["props_matching"]["PROP"])
          self._check_multivars(dbg["sv_matching"], expected["sv_matching"])

  def _check_multivars(self, got, want):
    self.assertEqual(got['SV'][0], want['SV'][0])

    got_multisv = got['MultiSV'].get('Candidates', [])
    want_multisv = want['MultiSV'].get('Candidates', [])
    self.assertEqual(len(want_multisv), len(got_multisv))
    for i in range(len(want_multisv)):
      want_parts = want_multisv[i]['Parts']
      got_parts = got_multisv[i]['Parts']
      self.assertEqual(len(want_parts), len(got_parts))
      for i in range(len(got_parts)):
        self.assertEqual(got_parts[i]['QueryPart'], want_parts[i]['QueryPart'])
        self.assertEqual(got_parts[i]['SV'][0], want_parts[i]['SV'][0])

    if not want_multisv:
      return

    if want['CosineScore'][0] > want_multisv[0]['AggCosineScore']:
      self.assertTrue(got['CosineScore'][0] > got_multisv[0]['AggCosineScore'])
    else:
      self.assertTrue(got['CosineScore'][0] < got_multisv[0]['AggCosineScore'])

  def handle_i18n_response(self, resp, i18n_lang):
    """The translation API does not always return the same translations.
    This makes golden comparisons flaky.
    So we instead extract the texts from the response and assert at least one of them is
    in the expected language.
    """
    texts: list[str] = []
    for category in resp.get("config", {}).get("categories", []):
      for block in category.get("blocks", []):
        for column in block.get("columns", []):
          for tile in column.get("tiles", []):
            title = tile.get("title")
            if title:
              texts.append(title)

    self.assertTrue(len(texts) > 0)

    success = False
    detected = ""
    for text in texts:
      detected = detect_lang(text).lower()
      if i18n_lang in detected:
        success = True
        break

    self.assertTrue(success, f"wanted: {i18n_lang}, got {detected}")

  def test_detection_statvars(self):
    self.run_detection('detection_api_statvars', [
        'Income in information industry in nevada',
        'Correlate with GDP of California'
    ])
