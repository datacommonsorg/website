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

import unittest

from parameterized import parameterized

from server.lib.nl.detection import llm_detector
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import CorrelationClassificationAttributes
from server.lib.nl.detection.types import EventClassificationAttributes
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import QCmpType
from server.lib.nl.detection.types import Quantity
from server.lib.nl.detection.types import QuantityClassificationAttributes
from server.lib.nl.detection.types import RankingClassificationAttributes
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import SuperlativeClassificationAttributes
from server.lib.nl.detection.types import SuperlativeType
from server.lib.nl.detection.types import TimeDeltaClassificationAttributes
from server.lib.nl.detection.types import TimeDeltaType
import shared.lib.detected_variables as dvars


class TestMergeSV(unittest.TestCase):

  @parameterized.expand([
      # When there's only 1 SV, we get what we give.
      (['population'], [{
          'SV': [
              'Count_Person', 'GrowthRate_Count_Person', 'Count_Person_Female'
          ],
          'CosineScore': [0.9, 0.8, 0.4]
      }], {
          'SV': [
              'Count_Person', 'GrowthRate_Count_Person', 'Count_Person_Female'
          ],
          'CosineScore': [0.9, 0.8, 0.4]
      }),
      # When there are multiple, we get a MultiSV.
      (['asthma', 'poverty'], [{
          'SV': ['Count_Person_Asthma', 'Percent_Person_Asthma'],
          'CosineScore': [0.9, 0.8]
      }, {
          'SV': ['Count_Person_BelowPoverty', 'Count_Person_FoodStamps'],
          'CosineScore': [0.7, 0.4]
      }], {
          'CosineScore': [0.9, 0.8],
          'MultiSV': {
              'Candidates': [{
                  'AggCosineScore':
                      1.0,
                  'DelimBased':
                      True,
                  'Parts': [{
                      'CosineScore': [0.9, 0.8],
                      'QueryPart': 'asthma',
                      'SV': ['Count_Person_Asthma', 'Percent_Person_Asthma']
                  }, {
                      'CosineScore': [0.7, 0.4],
                      'QueryPart':
                          'poverty',
                      'SV': [
                          'Count_Person_BelowPoverty', 'Count_Person_FoodStamps'
                      ]
                  }]
              }]
          },
          'SV': ['Count_Person_Asthma', 'Percent_Person_Asthma']
      }),
  ])
  def test_main(self, sv, sv_scores, want):
    self.maxDiff = None
    inputs = [dvars.test_dict_to_var_detection_result(i) for i in sv_scores]
    got = llm_detector._merge_sv_dicts(sv, inputs)
    self.assertEqual(dvars.var_detection_result_to_dict(got), want)


class TestBuildClassifications(unittest.TestCase):

  @parameterized.expand([
      (
          # [countries in the world with the highest poverty growth]
          {
              "GROWTH": "INCREASE",
              "METRICS": ["poverty"],
              "PLACES": ["world"],
              "RANK": "HIGH",
              "SUB_PLACE_TYPE": "COUNTRY"
          },
          None,
          [
              NLClassifier(type=ClassificationType.TIME_DELTA,
                           attributes=TimeDeltaClassificationAttributes(
                               time_delta_types=[TimeDeltaType.INCREASE],
                               time_delta_trigger_words=[])),
              NLClassifier(type=ClassificationType.RANKING,
                           attributes=RankingClassificationAttributes(
                               ranking_type=[RankingType.HIGH],
                               ranking_trigger_words=[])),
              NLClassifier(
                  type=ClassificationType.CONTAINED_IN,
                  attributes=ContainedInClassificationAttributes(
                      contained_in_place_type=ContainedInPlaceType.COUNTRY))
          ],
      ),
      (
          # [poverty vs asthma in california counties]
          {
              "COMPARE": "COMPARE_METRICS",
              "METRICS": ["poverty", "asthma"],
              "PLACES": ["california"],
              "SUB_PLACE_TYPE": "COUNTY"
          },
          None,
          [
              NLClassifier(type=ClassificationType.CORRELATION,
                           attributes=CorrelationClassificationAttributes(
                               correlation_trigger_words=[])),
              NLClassifier(
                  type=ClassificationType.CONTAINED_IN,
                  attributes=ContainedInClassificationAttributes(
                      contained_in_place_type=ContainedInPlaceType.COUNTY))
          ]),
      (
          # [big floods in california]
          {
              "DISASTER_EVENT": "FLOOD",
              "PLACES": ["California"],
              "SUPERLATIVE": "BIG",
          },
          None,
          [
              NLClassifier(type=ClassificationType.EVENT,
                           attributes=EventClassificationAttributes(
                               event_types=[EventType.FLOOD],
                               event_trigger_words=[])),
              NLClassifier(type=ClassificationType.SUPERLATIVE,
                           attributes=SuperlativeClassificationAttributes(
                               superlatives=[SuperlativeType.BIG],
                               superlatives_trigger_words=[]))
          ]),
      (
          # asthma in california counties where median age is over 40
          {
              "METRICS": ["asthma"],
              "PLACES": ["California"],
              "SUB_PLACE_TYPE":
                  "COUNTY",
              "COMPARISON_FILTER": [{
                  "COMPARISON_METRIC": "median age",
                  "COMPARISON_OPERATOR": "GREATER_THAN",
                  "VALUE": 40
              }],
          },
          'COMPARISON_FILTER',
          [
              NLClassifier(type=ClassificationType.QUANTITY,
                           attributes=QuantityClassificationAttributes(
                               qval=Quantity(cmp=QCmpType.GT, val=40.0),
                               qrange=None,
                               idx=0)),
              NLClassifier(
                  type=ClassificationType.CONTAINED_IN,
                  attributes=ContainedInClassificationAttributes(
                      contained_in_place_type=ContainedInPlaceType.COUNTY))
          ]),
      (
          # asthma in california counties where poverty is the highest
          {
              "COMPARISON_FILTER": None,
              "DISASTER_EVENT": None,
              "METRICS": ["asthma"],
              "PLACES": ["california"],
              "RANK": "HIGH",
              "RANKING_FILTER": [{
                  "RANKING_METRIC": "poverty",
                  "RANKING_OPERATOR": "IS_HIGHEST"
              }],
              "SUB_PLACE_TYPE": "COUNTY"
          },
          'RANKING_FILTER',
          [
              NLClassifier(type=ClassificationType.QUANTITY,
                           attributes=QuantityClassificationAttributes(
                               qval=Quantity(cmp=QCmpType.GE,
                                             val=2.2250738585072014e-308),
                               qrange=None,
                               idx=0)),
              NLClassifier(type=ClassificationType.RANKING,
                           attributes=RankingClassificationAttributes(
                               ranking_type=[RankingType.HIGH],
                               ranking_trigger_words=[])),
              NLClassifier(
                  type=ClassificationType.CONTAINED_IN,
                  attributes=ContainedInClassificationAttributes(
                      contained_in_place_type=ContainedInPlaceType.COUNTY))
          ]),
  ])
  def test_main(self, llm_resp, filter_type, want):
    self.maxDiff = None
    got = llm_detector._build_classifications(llm_resp, filter_type)
    self.assertEqual(got, want)
