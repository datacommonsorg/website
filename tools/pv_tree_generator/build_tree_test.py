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
from unittest.mock import patch
import json
from collections import defaultdict

import build_tree
from util import _read_pop_obs_spec, _read_stat_var

class BuildTreeTest(unittest.TestCase):
    """testing build_tree"""

    @staticmethod
    def get_sv():
        """pick a subset of stat_var dcids"""
        level0 = ['MarriedPopulation', 'DivorcedPopulation', 'MalePopulation']
        level1 = ['dc/0k7719speyv21', 'dc/2pvw6jqmkp41b', 'dc/06f6zh0wslnx',
               'dc/2rjldly6tsmf', 'dc/026gmdj2xk1kb', 'dc/f7g49v7tzy3rd']
        level2 = ['dc/61fzldryrnte1', 'dc/6yb4mgxtc1288', 'dc/esr27kls5vfy6',
                'dc/jhpflf91nvlt6', 'dc/cmn38d85glq72', 'dc/pj50xtdgxeh4g',
                'dc/pvsbze841l2tc', 'dc/tpeg0jxdts2t3']
        sv_dcid = level0 + level1 + level2
        return sv_dcid

    @staticmethod
    def get_triples_(dcids):
        """read the triples with predicates in the specified list"""
        triples = json.load(open("test_triples.json", "r"))
        results = defaultdict(list)
        #skip if the predicate is not in the list
        predicates = ["measuredProperty", "populationType", "statType",
            "income", "gender", "age", "incomeStatus", "citizenship"]
        for dcid in dcids:
            if dcid not in triples:
                raise Exception("triples not found for dcid: {}".format(dcid))
            for dcid_, prop, value in triples[dcid]:
                if prop == 'constraintProperties':
                    if value not in predicates:
                        continue
                elif prop not in predicates:
                    continue
                results[dcid].append((dcid_, prop, value))
        return dict(results)

    @patch('build_tree.MAX_LEVEL', 3)
    @patch('dc_request.get_triples')
    @patch('dc_request.get_sv_dcids')
    def test_build_tree(self, mock_get_sv, mock_get_triples):
        """build the tree with the mock functions, compare the result with
            hierarchy_test.json"""
        mock_get_sv.side_effect = self.get_sv
        mock_get_triples.side_effect = self.get_triples_
        pop_obs_spec = _read_pop_obs_spec()
        stat_vars = _read_stat_var()
        data = [{},{}]
        vertical = "Demographics"
        root = build_tree.build_tree(vertical, pop_obs_spec[vertical],
            stat_vars, False)
        data[0][vertical] = root
        root_search = build_tree.build_tree(vertical, pop_obs_spec[vertical],
            stat_vars, True)
        data[1][vertical] = root
        expected = json.load(open("./hierarchy_golden.json", "r"))
        self.assertEqual(data, expected)
        return
        
    @staticmethod
    def get_sv_search():
        dcids = ["notInWhiteListCitizenship", "inWhiteListMale", 
                 "inWhiteListIncome", "inWhiteListUnknownVal"]
        return dcids

    def get_search_vals():
        vals = set(['Female', 'Male', 'NotAUSCitizen', 'USDollar35000To49999'])
        return vals

    @patch('build_tree.SEARCH_VALS', get_search_vals())
    @patch('dc_request.get_triples')
    @patch('dc_request.get_sv_dcids')
    def test_search_white_list(self, mock_get_sv, mock_get_triples):
        mock_get_sv.side_effect = self.get_sv_search
        mock_get_triples.side_effect = self.get_triples_
        pop_obs_spec = _read_pop_obs_spec()
        stat_vars = _read_stat_var()
        data = [{},{}]
        vertical = "Demographics"
        root = build_tree.build_tree(vertical, pop_obs_spec[vertical],
            stat_vars, False)
        data[0][vertical] = root
        root_search = build_tree.build_tree(vertical, pop_obs_spec[vertical],
            stat_vars, True)
        data[1][vertical] = root
        self.assertEqual(data[0]['Demographics']['count'], 4) 
        self.assertEqual(data[1]['Demographics']['count'], 4)
        self.assertEqual(data[1]['Demographics']['search_count'], 2)
        for child in data[1]['Demographics']['children']:
            if child['title'] == 'Citizenship':
                self.assertEqual(child['count'],1)
                self.assertEqual(child['search_count'], 0)
            if child['title'] == 'Gender':
                self.assertEqual(child['count'], 2)
                self.assertEqual(child['search_count'], 1)
            if child['title'] == 'Income':
                self.assertEqual(child['count'], 1)
                self.assertEqual(child['search_count'], 1)
        return

        

if __name__ == "__main__":
    unittest.main()
