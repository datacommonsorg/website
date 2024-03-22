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

import unittest
from unittest import mock

from server.routes.shared_api.node import get_property_value_from_expression
from server.routes.shared_api.node import parse_property_expression
from server.routes.shared_api.node import PropertySpec

_PV_FETCH_RESULT_1 = {
    'rs13317': [{
        'dcid': 'a',
        'name': 'A'
    }, {
        'dcid': 'b',
        'name': 'B'
    }],
    'rs7903146': [{
        'dcid': 'c',
        'name': 'C'
    },]
}

_PV_FETCH_RESULT_2 = {
    'a': [{
        'dcid': 'aa',
        'name': 'AA'
    }, {
        'dcid': 'bb',
        'name': 'BB'
    }],
    'b': [{
        'dcid': 'cc',
        'name': 'CC'
    },],
    'c': [{
        'dcid': 'dd',
        'name': 'DD'
    }, {
        'dcid': 'ee',
        'name': 'EE'
    }]
}

_EXPRESSION_PV_RESULT = {
    'rs13317': [{
        'dcid': 'aa',
        'name': 'AA'
    }, {
        'dcid': 'bb',
        'name': 'BB'
    }, {
        'dcid': 'cc',
        'name': 'CC'
    }],
    'rs7903146': [{
        'dcid': 'dd',
        'name': 'DD'
    }, {
        'dcid': 'ee',
        'name': 'EE'
    }]
}


class TestGetPropertyValueFromExpression(unittest.TestCase):

  @mock.patch('server.lib.fetch.raw_property_values')
  def test_get_property_value_from_expression(self, fetch_pv):

    def fetch_pv_side_effects(nodes, prop, out, constraints):
      if nodes == [
          'rs13317', 'rs7903146'
      ] and prop == 'referenceSNPClusterID' and out == False and constraints == '{typeOf:GeneticVariantGeneAssociation}':
        return _PV_FETCH_RESULT_1
      elif nodes == ['a', 'b', 'c'
                    ] and prop == 'geneSymbol' and out and constraints == '':
        return _PV_FETCH_RESULT_2
      else:
        return None

    fetch_pv.side_effect = fetch_pv_side_effects
    result = get_property_value_from_expression([
        'rs13317', 'rs7903146'
    ], '<-referenceSNPClusterID{typeOf:GeneticVariantGeneAssociation}->geneSymbol'
                                               )
    assert result == _EXPRESSION_PV_RESULT


class TestParsePropertyExpression(unittest.TestCase):

  def test_parse_property_expression(self):

    cases = [{
        'expr': '->prop1',
        'expected': [PropertySpec(prop='prop1', out=True, constraints='')]
    }, {
        'expr': '<-prop1',
        'expected': [PropertySpec(prop='prop1', out=False, constraints='')]
    }, {
        'expr':
            '->prop1{typeOf:typeA}',
        'expected': [
            PropertySpec(prop='prop1', out=True, constraints='{typeOf:typeA}')
        ]
    }, {
        'expr':
            '->prop1<-prop2',
        'expected': [
            PropertySpec(prop='prop1', out=True, constraints=''),
            PropertySpec(prop='prop2', out=False, constraints='')
        ]
    }, {
        'expr':
            '<-prop1{typeOf:typeA}->prop2',
        'expected': [
            PropertySpec(prop='prop1', out=False, constraints='{typeOf:typeA}'),
            PropertySpec(prop='prop2', out=True, constraints='')
        ]
    }, {
        'expr':
            '<-prop1{typeOf:typeA}->prop2{typeOf:typeB}',
        'expected': [
            PropertySpec(prop='prop1', out=False, constraints='{typeOf:typeA}'),
            PropertySpec(prop='prop2', out=True, constraints='{typeOf:typeB}')
        ]
    }]
    for c in cases:
      parsed_result = parse_property_expression(c['expr'])
      assert parsed_result == c['expected']
