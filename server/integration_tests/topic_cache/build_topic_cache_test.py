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

#
# This doubles up as both the cache builder and integration test (to detect
# when the cache needs to be updated).
#
# To update the cache, just run `./run_test.sh -g`.
#

import json
import os
import unittest

import requests

TOPIC_CACHE_JSON = 'server/config/nl_page/topic_cache.json'

PROPS = set(['dcid', 'typeOf', 'name', 'memberList', 'relevantVariableList'])

PARSER = 'mcf_parser.py'
PARSER_URL = f'https://raw.githubusercontent.com/datacommonsorg/import/master/simple/kg_util/{PARSER}'
TOPIC_MCF = 'gen_ordered_list_for_topics.mcf'
TOPIC_MCF_URL = f'https://raw.githubusercontent.com/datacommonsorg/schema/main/stat_vars/{TOPIC_MCF}'

RUN_MODE = os.environ['TEST_MODE']


def build_topic_cache():
  with open(TOPIC_MCF, 'w') as f:
    f.write(requests.get(TOPIC_MCF_URL).text)

  with open(PARSER, 'w') as fw:
    fw.write(requests.get(PARSER_URL).text)
  import mcf_parser as mcflib

  mcf = {}
  with open(TOPIC_MCF, 'r') as f:
    for (s, p, o, _) in mcflib.mcf_to_triples(f):
      if s not in mcf:
        mcf[s] = {}
      if p not in PROPS:
        continue
      if p not in mcf[s]:
        mcf[s][p] = []
      if p.endswith('List'):
        mcf[s][p].extend([v.strip() for v in o.split(',') if v.strip()])
      else:
        mcf[s][p].append(o)

  nodes = []
  for k in sorted(mcf):
    nodes.append(mcf[k])
  cache = {'nodes': nodes}
  return cache


class IntegrationTest(unittest.TestCase):

  def test_main(self):
    cache = build_topic_cache()
    if RUN_MODE == 'write':
      with open(TOPIC_CACHE_JSON, 'w') as f:
        json.dump(cache, f, indent=2, sort_keys=True)
      print(f'Wrote {len(cache)} nodes to {TOPIC_CACHE_JSON}')
    else:
      got = json.dumps(build_topic_cache(), sort_keys=True, indent=2)
      with open(TOPIC_CACHE_JSON, 'r') as f:
        want = json.dumps(json.load(f), sort_keys=True, indent=2)
      self.maxDiff = None
      self.assertEqual(want, got)
