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


class Params(str, Enum):
  ENTITIES = 'entities'
  VARS = 'variables'
  CHILD_TYPE = 'childEntityType'
  CMP_ENTITIES = 'comparisonEntities'
  CMP_VARS = 'comparisonVariables'
  SESSION_ID = 'sessionId'
  CTX = 'context'
  DC = 'dc'
  EXT_SVGS = 'extensionGroups'
  EXP_MORE = 'exploreMore'


class DCNames(str, Enum):
  MAIN_DC = 'main'
  SDG_DC = 'sdg'
  SDG_MINI_DC = 'sdgmini'


def is_sdg(insight_ctx: Dict) -> bool:
  return insight_ctx.get(
      Params.DC.value) in [DCNames.SDG_DC.value, DCNames.SDG_MINI_DC.value]
