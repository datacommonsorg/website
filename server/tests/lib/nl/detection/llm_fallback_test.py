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

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection.llm_fallback import need_llm
from server.lib.nl.detection.llm_fallback import NeedLLM
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import ContainedInClassificationAttributes
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from server.lib.nl.detection.utils import empty_var_candidates
from shared.lib import detected_variables as dvars


def _place():
  return PlaceDetection(query_original='',
                        query_without_place_substr='foo bar',
                        query_places_mentioned=['california'],
                        places_found=[Place('geoId/06', 'CA', 'State')],
                        main_place=None,
                        entities_found=[],
                        query_entities_mentioned=[])


def _sv(v=[], delim=False, above_thres=False):
  if len(v) == 1:
    return SVDetection(query='',
                       single_sv=dvars.VarCandidates(v, [1.0], {}),
                       multi_sv=None,
                       prop=empty_var_candidates())
  if len(v) == 2:
    if above_thres:
      scores = [0.9]
    else:
      scores = [0.7]
    return SVDetection(query='',
                       single_sv=dvars.VarCandidates(v, [0.6, 0.4], {}),
                       multi_sv=dvars.MultiVarCandidates(candidates=[
                           dvars.MultiVarCandidate(parts=[
                               dvars.MultiVarCandidatePart(
                                   query_part=v[0], svs=[v[0]], scores=scores),
                               dvars.MultiVarCandidatePart(
                                   query_part=v[1], svs=[v[1]], scores=scores)
                           ],
                                                   aggregate_score=0.7,
                                                   delim_based=delim)
                       ]),
                       prop=empty_var_candidates())
  return SVDetection(query='',
                     single_sv=empty_var_candidates(),
                     prop=empty_var_candidates(),
                     multi_sv=None)


def _nlcl(t, pt=None):
  if not pt:
    return [NLClassifier(type=t, attributes=None)]
  else:
    return [
        NLClassifier(type=t,
                     attributes=ContainedInClassificationAttributes(
                         contained_in_place_type=pt))
    ]


class TestLLMFallback(unittest.TestCase):

  @parameterized.expand([
      (
          # Given place but no SV found.  Fallback.
          Detection(original_query='california',
                    cleaned_query='california',
                    places_detected=_place(),
                    svs_detected=_sv(),
                    classifications=[]),
          NeedLLM.ForVar,
          'info_fallback_no_sv_found'),
      (
          # Same as above, but since its OVERVIEW, we ignore
          # the lack of SV.  NO fallback.
          Detection(original_query='tell me about california',
                    cleaned_query='tell me about california',
                    places_detected=_place(),
                    svs_detected=_sv(),
                    classifications=_nlcl(ClassificationType.OVERVIEW)),
          NeedLLM.No,
          ''),
      (
          # Same as above, but since its SUPERLATIVE, we ignore
          # the lack of SV.  NO fallback.
          Detection(original_query='size of california',
                    cleaned_query='size of california',
                    places_detected=_place(),
                    svs_detected=_sv(),
                    classifications=_nlcl(ClassificationType.SUPERLATIVE)),
          NeedLLM.No,
          ''),
      (
          # No place found, fallback.
          Detection(original_query='hispanic population',
                    cleaned_query='hispanic population',
                    places_detected=None,
                    svs_detected=_sv(['Count_Person_Hispanic']),
                    classifications=_nlcl(ClassificationType.OVERVIEW)),
          NeedLLM.ForPlace,
          'info_fallback_no_place_found'),
      (
          # No place found, but Country type, so Earth is assumed.
          Detection(original_query='health in the world',
                    cleaned_query='health in the world',
                    places_detected=None,
                    svs_detected=_sv(['dc/topic/Health']),
                    classifications=_nlcl(ClassificationType.CONTAINED_IN,
                                          ContainedInPlaceType.COUNTRY)),
          NeedLLM.No,
          ''),
      (
          # Single SV with place.  NO Fallback.
          Detection(original_query='hispanic population in california',
                    cleaned_query='hispanic population in california',
                    places_detected=_place(),
                    svs_detected=_sv(['Count_Person_Hispanic']),
                    classifications=[]),
          NeedLLM.No,
          ''),
      (
          # Multi-SV query, with delimiter, score below threshold, don't fallback.
          Detection(original_query='hispanic vs. asian in california',
                    cleaned_query='hispanic vs asian in california',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian'],
                                     delim=True,
                                     above_thres=False),
                    classifications=[]),
          NeedLLM.No,
          'info_fallback_below_high_threshold'),
      (
          # Multi-SV query, with delimiter, score above threshold, fallback.
          Detection(original_query='hispanic vs. asian in california',
                    cleaned_query='hispanic vs asian in california',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian'],
                                     delim=True,
                                     above_thres=True),
                    classifications=[]),
          NeedLLM.ForVar,
          'info_fallback_multi_sv_delimiter'),
      (
          # Same as above, but with comparison classification, don't fallback.
          Detection(original_query='hispanic vs. asian in california',
                    cleaned_query='hispanic vs asian in california',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian'],
                                     True,
                                     above_thres=True),
                    classifications=_nlcl(ClassificationType.CORRELATION)),
          NeedLLM.No,
          'info_fallback_dual_sv_correlation'),
      (
          # Multi-SV query, but without explicit delimiter.  NO fallback.
          Detection(original_query='hispanic asian in california',
                    cleaned_query='hispanic asian in california',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian'], above_thres=True),
                    classifications=[]),
          NeedLLM.No,
          'info_fallback_multi_sv_no_delim'),
      (
          # Multi-SV query, but without explicit delimiter, but place delimits
          # sv parts.
          Detection(original_query='hispanic in california with most asian',
                    cleaned_query='hispanic in california with most asian',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian'], above_thres=True),
                    classifications=[]),
          NeedLLM.ForVar,
          'info_fallback_place_within_multi_sv'),
  ])
  def test_main(self, heuristic, fallback, counter):
    ctr = Counters()
    got = need_llm(heuristic, None, ctr)
    self.assertEqual(got, fallback)
    if counter:
      if 'info' in counter:
        self.assertTrue(counter in ctr.get()['INFO'])
      else:
        self.assertTrue(counter in ctr.get()['ERROR'])
