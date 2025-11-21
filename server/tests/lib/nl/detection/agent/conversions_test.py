# Copyright 2025 Google LLC
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

from server.lib.nl.common import counters
from server.lib.nl.detection.agent.conversions import \
    convert_agent_detection_to_detection
from server.lib.nl.detection.agent.types import AgentDetection
from server.lib.nl.detection.agent.types import Place as AgentPlace
from server.lib.nl.detection.types import ActualDetectorType
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from shared.lib.detected_variables import MultiVarCandidates
from shared.lib.detected_variables import SentenceScore
from shared.lib.detected_variables import VarCandidates


class TestConversions(unittest.TestCase):

  def test_basic_conversion(self):
    agent_detection = AgentDetection(classification="Ranking",
                                     places=[
                                         AgentPlace(dcid="geoId/06",
                                                    name="California",
                                                    place_type="State")
                                     ],
                                     indicators={"Count_Person": "Population"})
    query = "rank states by population"
    ctr = counters.Counters()

    detection = convert_agent_detection_to_detection(agent_detection, query,
                                                     ctr)

    expected_detection = Detection(
        original_query=query,
        cleaned_query=query,
        places_detected=PlaceDetection(query_original=query,
                                       query_without_place_substr=query,
                                       query_places_mentioned=[],
                                       query_entities_mentioned=[],
                                       places_found=[
                                           Place(dcid="geoId/06",
                                                 name="California",
                                                 place_type="State")
                                       ],
                                       entities_found=[],
                                       main_place=None,
                                       parent_places=[]),
        svs_detected=SVDetection(
            query=query,
            single_sv=VarCandidates(svs=["Count_Person"],
                                    scores=[1.0],
                                    sv2sentences={
                                        "Count_Person": [
                                            SentenceScore(sentence="Population",
                                                          score=1.0)
                                        ]
                                    }),
            prop=VarCandidates(svs=[], scores=[], sv2sentences={}),
            multi_sv=MultiVarCandidates(candidates=[]),
            sv_threshold=0.5,
            model_threshold=0.5),
        classifications=[
            NLClassifier(type=ClassificationType.RANKING, attributes={})
        ],
        llm_resp={},
        detector="Agent")

    self.assertEqual(detection, expected_detection)

  def test_empty_conversion(self):
    agent_detection = AgentDetection(classification="Unknown")
    query = "foo bar"
    ctr = counters.Counters()

    detection = convert_agent_detection_to_detection(agent_detection, query,
                                                     ctr)

    expected_detection = Detection(
        original_query=query,
        cleaned_query=query,
        places_detected=PlaceDetection(query_original=query,
                                       query_without_place_substr=query,
                                       query_places_mentioned=[],
                                       query_entities_mentioned=[],
                                       places_found=[],
                                       entities_found=[],
                                       main_place=None,
                                       parent_places=[]),
        svs_detected=SVDetection(query=query,
                                 single_sv=VarCandidates(svs=[],
                                                         scores=[],
                                                         sv2sentences={}),
                                 prop=VarCandidates(svs=[],
                                                    scores=[],
                                                    sv2sentences={}),
                                 multi_sv=MultiVarCandidates(candidates=[]),
                                 sv_threshold=0.5,
                                 model_threshold=0.5),
        classifications=[
            NLClassifier(type=ClassificationType.UNKNOWN, attributes={})
        ],
        llm_resp={},
        detector="Agent")

    self.assertEqual(detection, expected_detection)
