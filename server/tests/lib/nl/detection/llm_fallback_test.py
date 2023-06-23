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
"""Tests for quantity_parser."""

import logging
import unittest

from parameterized import parameterized

from server.lib.nl.common.counters import Counters
from server.lib.nl.detection.llm_fallback import need_llm
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Detection
from server.lib.nl.detection.types import NLClassifier
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import PlaceDetection
from server.lib.nl.detection.types import SVDetection
from shared.lib import detected_variables as vars


def _place():
  return PlaceDetection(query_original='',
                        query_without_place_substr='',
                        query_places_mentioned=['california'],
                        places_found=[Place('geoId/06', 'CA', 'State')],
                        main_place=None)


def _sv(v=[], delim=False):
  if len(v) == 1:
    return SVDetection(query='',
                       single_sv=vars.VarCandidates(v, [1.0], {}),
                       multi_sv=None)
  if len(v) == 2:
    return SVDetection(query='',
                       single_sv=vars.VarCandidates(v, [0.6, 0.4], {}),
                       multi_sv=vars.MultiVarCandidates(candidates=[
                           vars.MultiVarCandidate(parts=[
                               vars.MultiVarCandidatePart(
                                   query_part=v[0], svs=[v[0]], scores=[]),
                               vars.MultiVarCandidatePart(
                                   query_part=v[1], svs=[v[1]], scores=[])
                           ],
                                                  aggregate_score=0.7,
                                                  delim_based=delim)
                       ]))
  return SVDetection(query='',
                     single_sv=vars.VarCandidates([], [], {}),
                     multi_sv=None)


def _nlcl(t):
  return [NLClassifier(type=t, attributes=None)]


class TestLLMFallback(unittest.TestCase):

  @parameterized.expand([
      (
          # Given place but no SV found.  Fallback.
          Detection(original_query='california',
                    cleaned_query='',
                    places_detected=_place(),
                    svs_detected=_sv(),
                    classifications=[]),
          True,
          'info_fallback_no_sv_found'),
      (
          # Same as above, but since its OVERVIEW, we ignore
          # the lack of SV.  NO fallback.
          Detection(original_query='tell me about california',
                    cleaned_query='',
                    places_detected=_place(),
                    svs_detected=_sv(),
                    classifications=_nlcl(ClassificationType.OVERVIEW)),
          False,
          ''),
      (
          # No place found, fallback.
          Detection(original_query='hispanic population',
                    cleaned_query='',
                    places_detected=None,
                    svs_detected=_sv(['Count_Person_Hispanic']),
                    classifications=_nlcl(ClassificationType.OVERVIEW)),
          True,
          'info_fallback_no_place_found'),
      (
          # Single SV with place.  NO Fallback.
          Detection(original_query='hispanic population in california',
                    cleaned_query='',
                    places_detected=_place(),
                    svs_detected=_sv(['Count_Person_Hispanic']),
                    classifications=[]),
          False,
          ''),
      (
          # Multi-SV query, with delimiter, fallback.
          Detection(original_query='hispanic vs. asian in california',
                    cleaned_query='',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian'], True),
                    classifications=[]),
          True,
          'info_fallback_multi_sv_delimiter'),
      (
          # Multi-SV query, but without explicit delimiter.  NO fallback.
          Detection(original_query='hispanic asian in california',
                    cleaned_query='',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian']),
                    classifications=[]),
          False,
          'info_fallback_multi_sv_no_delim'),
      (
          # Multi-SV query, but without explicit delimiter, but place delimits
          # sv parts.
          Detection(original_query='hispanic in california with most asian',
                    cleaned_query='',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian']),
                    classifications=[]),
          True,
          'info_fallback_place_within_multi_sv'),
      (
          # Multi-SV query, with no delimiter, but a very long query.
          Detection(original_query=
                    'hispanic asian and a bunch of other words in california',
                    cleaned_query='',
                    places_detected=_place(),
                    svs_detected=_sv(['hispanic', 'asian']),
                    classifications=[]),
          True,
          'info_fallback_query_very_long')
  ])
  def test_main(self, heuristic, fallback, counter):
    ctr = Counters()
    got = need_llm(heuristic, ctr)
    if fallback:
      self.assertTrue(got)
    else:
      self.assertFalse(got)
    if counter:
      if 'info' in counter:
        self.assertTrue(counter in ctr.get()['INFO']), ctr.get()
      else:
        self.assertTrue(counter in ctr.get()['ERROR']), ctr.get()
