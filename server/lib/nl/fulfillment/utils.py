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

from typing import Dict, List

from server.lib.nl.common import constants
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import NLClassifier

#
# General utilities for retrieving stuff from past context.
#


def has_sv(uttr: Utterance) -> bool:
  if not uttr:
    return False

  if uttr.svs:
    return True

  if uttr.insight_ctx and uttr.insight_ctx.get('variables'):
    return True

  return False


def has_place(uttr: Utterance) -> bool:
  if not uttr:
    return False

  if uttr.places:
    return True

  if uttr.insight_ctx and uttr.insight_ctx.get('entities'):
    return True

  return False


def classifications_of_type_from_utterance(
    uttr: Utterance, ctype: ClassificationType) -> List[NLClassifier]:
  return [cl for cl in uttr.classifications if cl.type == ctype]


def classifications_of_type(classifications: List[NLClassifier],
                            ctype: ClassificationType) -> List[NLClassifier]:
  return [cl for cl in classifications if cl.type == ctype]


# `context_history` contains utterances in a given session.
def get_session_info(context_history: List[Dict], has_data: bool) -> Dict:
  session_info = {'items': []}
  # The first entry in context_history is the most recent.
  # Reverse the order for session_info.
  for i in range(len(context_history)):
    u = context_history[len(context_history) - 1 - i]
    if 'id' not in session_info:
      session_info['id'] = u['session_id']
    if has_data:
      s = constants.QUERY_OK
    else:
      s = constants.QUERY_FAILED
    session_info['items'].append({
        'query': u.get('query', ''),
        'insightCtx': u.get('insightCtx', {}),
        'status': s,
    })
  return session_info
