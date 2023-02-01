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
"""Integration tests for NL Next fulfillment."""

from typing import Dict, List
import unittest
from unittest.mock import patch

from lib.nl import fulfillment_next
from lib.nl import utils
from lib.nl import utterance
from lib.nl import variable
from lib.nl.detection import ClassificationType
from lib.nl.detection import ContainedInPlaceType
from lib.nl.detection import Detection
from lib.nl.detection import NLClassifier
from lib.nl.detection import Place
from lib.nl.detection import PlaceDetection
from lib.nl.detection import RankingType
from lib.nl.detection import SVDetection
import lib.nl.detection as nl_detection
from lib.nl.fulfillment import base
from tests.lib.nl.test_utterance import COMPARISON_UTTR
from tests.lib.nl.test_utterance import CONTAINED_IN_UTTR
from tests.lib.nl.test_utterance import CORRELATION_UTTR
from tests.lib.nl.test_utterance import PLACE_ONLY_UTTR
from tests.lib.nl.test_utterance import RANKING_UTTR
from tests.lib.nl.test_utterance import SIMPLE_UTTR
from tests.lib.nl.test_utterance import SIMPLE_WITH_SV_EXT_UTTR
from tests.lib.nl.test_utterance import SIMPLE_WITH_TOPIC_UTTR


#
# External interfaces that need mocking:
# - variable.extend_svs
# - utils.sv_existence_for_places
# - utils.get_sample_child_places
# - fulfillment.base._svg_or_topic_to_svs
#
class TestDataSpecNext(unittest.TestCase):

  def test_place_only(self):
    detection = _detection(
        'geoId/06',
        # Very low scores that we should ignore all SVs.
        ['Count_Person_Male', 'Count_Person_Female', 'Count_Person_Foo'],
        [0.4, 0.2, 0.1])

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, PLACE_ONLY_UTTR)

  # Example: [male population in california]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places')
  def test_simple(self, mock_sv_existence, mock_extend_svs):
    # First 2 SVs should be considered, and 3rd one dropped.
    detection = _detection(
        'geoId/06',
        ['Count_Person_Male', 'Count_Person_Female', 'Count_Person_Foo'],
        [0.6, 0.51, 0.4])

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Make SVs exist
    mock_sv_existence.side_effect = [['Count_Person_Male'],
                                     ['Count_Person_Female']]

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_UTTR)

  # This follows up on test_simple()
  # Example: [how many farms in its counties]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'get_sample_child_places')
  @patch.object(utils, 'sv_existence_for_places')
  def test_contained_in(self, mock_sv_existence, mock_child_places,
                        mock_extend_svs):
    # Detect a single SV for farms, with NO place.
    detection = _detection(None, ['Count_Farm'], [0.6],
                           ClassificationType.CONTAINED_IN)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Return santa clara as child place
    mock_child_places.return_value = ['geoId/06085']
    # - Make SVs exist
    mock_sv_existence.side_effect = [['Count_Farm']]

    got = _run(detection, [SIMPLE_UTTR])

    self.maxDiff = None
    self.assertEqual(got, CONTAINED_IN_UTTR)

  # This follows up on test_contained_in()
  # Example: [how does that correlate with rainfall]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'get_sample_child_places')
  @patch.object(utils, 'sv_existence_for_places')
  def test_correlation(self, mock_sv_existence, mock_child_places,
                       mock_extend_svs):
    # Detect a single SV for rainfall, with NO place.
    detection = _detection(None, ['Mean_Precipitation'], [0.6],
                           ClassificationType.CORRELATION)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Return santa clara as child place
    mock_child_places.return_value = ['geoId/06085']
    # - Make SVs exist
    mock_sv_existence.side_effect = [['Count_Farm'], ['Mean_Precipitation']]

    # Pass in both simple and contained-in utterances.
    got = _run(detection, [SIMPLE_UTTR, CONTAINED_IN_UTTR])

    self.maxDiff = None
    self.assertEqual(got, CORRELATION_UTTR)

  # This follows up on test_correlation()
  # Example: [which ones have the most agricultural workers]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'get_sample_child_places')
  @patch.object(utils, 'sv_existence_for_places')
  def test_ranking(self, mock_sv_existence, mock_child_places, mock_extend_svs):
    # Detect a single SV for rainfall, with NO place.
    detection = _detection(None, ['Count_Agricultural_Workers'], [0.6],
                           ClassificationType.RANKING)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Return santa clara as child place
    mock_child_places.return_value = ['geoId/06085']
    # - Make SVs exist
    mock_sv_existence.side_effect = [['Count_Agricultural_Workers']]

    # Pass in both simple and contained-in utterances.
    got = _run(detection, [SIMPLE_UTTR, CONTAINED_IN_UTTR, CORRELATION_UTTR])

    self.maxDiff = None
    self.assertEqual(got, RANKING_UTTR)

  # This follows up on test_simple()
  # Example: [how does that compare with nevada?]
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places')
  def test_comparison(self, mock_sv_existence, mock_extend_svs):
    # No SVs are detected.
    detection = _detection('geoId/32', [], [], ClassificationType.COMPARISON)

    # MOCK:
    # - Do no SV extensions
    mock_extend_svs.return_value = {}
    # - Make SVs (from context) exist
    mock_sv_existence.side_effect = [['Count_Person_Male'],
                                     ['Count_Person_Female']]

    # Pass in the simple SV utterance as context
    got = _run(detection, [SIMPLE_UTTR])

    self.maxDiff = None
    self.assertEqual(got, COMPARISON_UTTR)

  # This exercises SV expansion to peers.
  @patch.object(variable, 'extend_svs')
  @patch.object(utils, 'sv_existence_for_places')
  def test_simple_with_sv_extension(self, mock_sv_existence, mock_extend_svs):
    # Detect a single SV.
    detection = _detection('geoId/06', ['Count_Person_Male'], [0.6])

    # MOCK:
    # - Return gender extensions
    mock_extend_svs.return_value = {
        'Count_Person_Male': ['Count_Person_Male', 'Count_Person_Female']
    }
    # - Make SVs exist. Importantly, the second call is for both male + female.
    mock_sv_existence.side_effect = [['Count_Person_Male'],
                                     [
                                         'Count_Person_Male',
                                         'Count_Person_Female'
                                     ]]

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_WITH_SV_EXT_UTTR)

  # This exercises Topic expansion.
  @patch.object(variable, 'extend_svs')
  @patch.object(base, '_svg_or_topic_to_svs')
  @patch.object(utils, 'sv_existence_for_places')
  def test_simple_with_topic(self, mock_sv_existence, mock_topic_to_svs,
                             mock_extend_svs):
    # Detect a topic.
    detection = _detection('geoId/06', ['dc/topic/Agriculture'], [0.6])

    # MOCK:
    # - No extensions.
    mock_extend_svs.return_value = {}
    # - Return 3 ChartVars: two with an SV each, and another with an SVPG.
    mock_topic_to_svs.return_value = [
        base.ChartVars(
            svs=['Count_Farm'],
            block_id=1,
            include_percapita=False,
        ),
        base.ChartVars(
            svs=['Area_Farm'],
            block_id=1,
            include_percapita=False,
        ),
        base.ChartVars(
            svs=[
                'FarmInventory_Rice', 'FarmInventory_Wheat',
                'FarmInventory_Barley'
            ],
            block_id=2,
            include_percapita=False,
        )
    ]
    # - Make SVs exist. Importantly, in the order in which the ChartVars were set.
    #   Make Wheat inventory fail existence check.
    mock_sv_existence.side_effect = [['Count_Farm'], ['Area_Farm'],
                                     [
                                         'FarmInventory_Rice',
                                         'FarmInventory_Barley'
                                     ]]

    got = _run(detection, [])

    self.maxDiff = None
    self.assertEqual(got, SIMPLE_WITH_TOPIC_UTTR)


# Helper to construct Detection() class.
def _detection(place: str,
               svs: List[str],
               scores: List[float],
               query_type: ClassificationType = ClassificationType.SIMPLE):
  if place:
    places_detected = PlaceDetection(query_original='foo sv in place',
                                     places_found=[],
                                     query_without_place_substr='foo sv',
                                     main_place=Place(dcid=place,
                                                      name='Foo Place',
                                                      place_type='State'))
  else:
    places_detected = None
  detection = Detection(original_query='foo sv in place',
                        cleaned_query='foo sv in place',
                        classifications=[],
                        places_detected=places_detected,
                        svs_detected=SVDetection(query='foo sv',
                                                 svs_to_sentences={},
                                                 sv_dcids=svs,
                                                 sv_scores=scores))
  detection.query_type = query_type
  if query_type == ClassificationType.COMPARISON:
    # Set comparison classifier
    detection.classifications = [
        NLClassifier(type=ClassificationType.COMPARISON,
                     attributes=nl_detection.ComparisonClassificationAttributes(
                         comparison_trigger_words=['compare']))
    ]
  elif query_type == ClassificationType.CONTAINED_IN:
    detection.classifications = [
        NLClassifier(
            type=ClassificationType.CONTAINED_IN,
            attributes=nl_detection.ContainedInClassificationAttributes(
                contained_in_place_type=ContainedInPlaceType.COUNTY))
    ]
  elif query_type == ClassificationType.CORRELATION:
    detection.classifications = [
        NLClassifier(
            type=ClassificationType.CORRELATION,
            attributes=nl_detection.CorrelationClassificationAttributes(
                correlation_trigger_words=['correlate']))
    ]
  elif query_type == ClassificationType.RANKING:
    detection.classifications = [
        NLClassifier(type=ClassificationType.RANKING,
                     attributes=nl_detection.RankingClassificationAttributes(
                         ranking_type=[RankingType.HIGH],
                         ranking_trigger_words=['most', 'highest']))
    ]

  return detection


def _run(detection: Detection, uttr_dict: List[Dict]):
  prev_uttr = None
  if uttr_dict:
    prev_uttr = utterance.load_utterance(uttr_dict)
  return utterance.save_utterance(fulfillment_next.fulfill(
      detection, prev_uttr))[0]
