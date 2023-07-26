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

import copy
from enum import Enum
import logging
from typing import Dict

import server.lib.nl.common.utils as utils
import server.lib.nl.common.utterance as nl_uttr
from server.lib.nl.detection.types import ClassificationType


class Params(str, Enum):
  ENTITIES = 'entities'
  VARS = 'variables'
  CHILD_TYPE = 'childEntityType'
  CMP_TYPE = 'comparisonType'
  CMP_TYPE_ENTITY = 'ENTITY'
  SESSION_ID = 'sessionId'
  CTX = 'context'


def detect_with_context(uttr: nl_uttr.Utterance) -> Dict:
  data_dict = {}

  # 1. Get past places.
  past_ctx = {}
  if uttr.prev_utterance:
    past_ctx = uttr.prev_utterance.insight_ctx

  # 2. Detect places (and comparison type) leveraging context.
  svs = []
  places = []
  cmp_type = None
  if _is_comparison(uttr):
    if len(uttr.places) > 1:
      # Completely in this query.
      places = [p.dcid for p in uttr.places]
    elif len(uttr.places) == 1:
      # Partially in this query, lookup context.
      places = [uttr.places[0].dcid] + past_ctx.get(Params.ENTITIES.value, [])
      logging.info('Reading ENTITIES for cmp partially from context {places}')
    else:
      # Completely in context.
      places = past_ctx.get(Params.ENTITIES.value, [])
      logging.info('Reading ENTITIES for cmp fully from context {places}')
    if len(places) > 1:
      cmp_type = Params.CMP_TYPE_ENTITY.value
  else:
    # Not comparison.
    if uttr.places:
      places = [p.dcid for p in uttr.places]
    else:
      # Find place from context.
      places = past_ctx.get(Params.ENTITIES.value, [])
      logging.info('Reading ENTITIES fully from context {places}')

  # 3. Detect SVs leveraging context.
  if uttr.svs:
    svs = uttr.svs
  else:
    # Try to get svs from context.
    svs = past_ctx.get(Params.VARS.value, [])
    logging.info('Reading VARS fully from context {places}')

  # Populated dict with basic info
  data_dict.update({
      Params.ENTITIES.value: places,
      Params.VARS.value: svs,
      Params.SESSION_ID: uttr.session_id,
  })

  # Populate additional classifications.
  if cmp_type:
    data_dict[Params.CMP_TYPE.value] = cmp_type
  # Contained-in
  place_type = utils.get_contained_in_type(uttr)
  if place_type:
    data_dict[Params.CHILD_TYPE.value] = place_type.value

  # Set the detected params in uttr ctx and clear past contexts.
  uttr.insight_ctx = copy.deepcopy(data_dict)
  uttr.prev_utterance = None

  data_dict[Params.CTX.value] = nl_uttr.save_utterance(uttr)
  return data_dict


def _is_comparison(uttr: nl_uttr.Utterance) -> bool:
  for cl in uttr.classifications:
    if cl.type in [
        ClassificationType.COMPARISON, ClassificationType.CORRELATION
    ]:
      return True
  return False
