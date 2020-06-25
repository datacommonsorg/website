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

import util
import unittest
from unittest.mock import patch
from build_tree import build_tree
import dc_request
from configmodule import DevelopmentConfig
import json
from collections import defaultdict

class BuildTreeTest(unittest.TestCase):
    @staticmethod
    def get_sv():
        #pick a subset of stat_var dcids
        level0 = ['MarriedPopulation','DivorcedPopulation','MalePopulation']
        level1 = ['dc/0k7719speyv21','dc/2pvw6jqmkp41b','dc/06f6zh0wslnx',\
               'dc/2rjldly6tsmf','dc/026gmdj2xk1kb','dc/f7g49v7tzy3rd']
        level2 = ['dc/61fzldryrnte1','dc/6yb4mgxtc1288','dc/esr27kls5vfy6',\
                'dc/jhpflf91nvlt6','dc/cmn38d85glq72','dc/pj50xtdgxeh4g',\
                'dc/pvsbze841l2tc','dc/tpeg0jxdts2t3']
        sv_dcid = level0 + level1 + level2
        return sv_dcid

    @staticmethod
    def get_triples_(dcids):
        url = DevelopmentConfig.API_ROOT + '/node/triples'
        payload = dc_request.send_request(url, req_json={'dcids': dcids})
        results = defaultdict(list)
        #skip if the predicate is not in the list
        predicates = ["measuredProperty", "populationType", "statType", "income", \
            "gender", "age", "incomeStatus"]
        predicates_all = set()
        for dcid in dcids:
            results[dcid]
            for t in payload[dcid]:
                if 'objectId' in t:
                    value = t['objectId']
                elif 'objectValue' in t:
                    value = t['objectValue']

                if t['predicate'] == 'constraintProperties':
                    if value not in predicates:
                        continue
                elif t['predicate'] not in predicates:
                    continue
                predicates_all.add(t['predicate'])
                results[dcid].append((t['subjectId'], t['predicate'], value))
        return dict(results)
      
    @patch('build_tree.MAX_LEVEL', 3)
    @patch('dc_request.get_triples')
    @patch('dc_request.get_sv_dcids')
    def test_build_tree(self,mock_get_sv, mock_get_triples):
        mock_get_sv.side_effect = self.get_sv
        mock_get_triples.side_effect = self.get_triples_
        pop_obs_spec = util._read_pop_obs_spec()
        stat_vars = util._read_stat_var()
        data = {}
        vertical = "Demographics"
        root = build_tree(vertical, pop_obs_spec[vertical], stat_vars, False)
        data[vertical] = root
        expected = json.load(open("./hierarchy_test.json","r"))
        self.assertEqual(data, expected)
        return
      
if __name__ == "__main__":
    unittest.main()
