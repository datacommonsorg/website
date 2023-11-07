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

from enum import Enum
from typing import Dict

from shared.lib import constants


class Params(str, Enum):
  ENTITIES = 'entities'
  VARS = 'variables'
  CHILD_TYPE = 'childEntityType'
  CMP_ENTITIES = 'comparisonEntities'
  CMP_VARS = 'comparisonVariables'
  CLASSIFICATIONS = 'classifications'
  SESSION_ID = 'sessionId'
  CTX = 'context'
  DC = 'dc'
  EXT_SVGS = 'extensionGroups'
  EXP_MORE_DISABLED = 'disableExploreMore'
  # Indicating it's a test query and the type of test, ex, "test=screenshot"
  TEST = 'test'
  I18N = 'i18n'
  # The mode of query detection.
  # - 'strict': detect and fulfill more specific queries (without too many verbs),
  #             using a higher SV cosine score threshold (0.7), and without
  #             using a default place (if query doesn't specify places).
  #    Ex, if multiple verbs present, treat as action query and do not fulfill.
  MODE = 'mode'


class DCNames(str, Enum):
  MAIN_DC = 'main'
  SDG_DC = 'sdg'
  SDG_MINI_DC = 'sdgmini'


class QueryMode(str, Enum):
  # NOTE: This mode is incompatible with LLM detector
  STRICT = 'strict'


# Get the SV score threshold for the given mode.
def sv_threshold(mode: str) -> bool:
  if mode == QueryMode.STRICT:
    return constants.SV_SCORE_HIGH_CONFIDENCE_THRESHOLD
  else:
    return constants.SV_SCORE_DEFAULT_THRESHOLD


def is_sdg(insight_ctx: Dict) -> bool:
  return insight_ctx.get(
      Params.DC.value) in [DCNames.SDG_DC.value, DCNames.SDG_MINI_DC.value]
