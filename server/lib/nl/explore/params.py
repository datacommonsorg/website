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

from server.lib.nl.detection.types import DetectionArgs
from shared.lib import constants


class Params(str, Enum):
  ENTITIES = 'entities'
  NON_PLACE_ENTITIES = 'nonPlaceEntities'
  VARS = 'variables'
  PROPS = 'properties'
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
  CLIENT = 'client'
  # If set then we don't strip stop-words for mono-variable match.
  INCLUDE_STOP_WORDS = 'includeStopWords'
  VAR_THRESHOLD = 'varThreshold'
  DETECTOR = 'detector'
  INDEX = 'idx'
  RERANKER = 'reranker'


class DCNames(str, Enum):
  MAIN_DC = 'main'
  SDG_DC = 'sdg'
  SDG_MINI_DC = 'sdgmini'
  # Production UN Data index. Contains SDG and WHO data
  UNDATA_DC = 'undata'
  # Dev UN Data index. Contains SDG, WHO, and ILO data
  # TODO(dwnoble): Remove after ILO launch
  UNDATA_DEV_DC = 'undata_dev'
  # Dev UN Data index. Contains ILO data
  # TODO(dwnoble): Remove after ILO launch
  UNDATA_ILO_DC = 'undata_ilo'
  BIO_DC = 'bio'
  CUSTOM_DC = 'custom'


class QueryMode(str, Enum):
  # NOTE: This mode is incompatible with LLM detector
  STRICT = 'strict'
  # These are special modes used for toolformer experiments.

  # The point mode returns exact variable's values and used by RIG.
  # It does not detect topics and has a higher sv score threshold of 0.8.
  TOOLFORMER_POINT = 'toolformer_point'
  # The table mode includes topics, has lower threshold and tries harder
  # to return tables with fuller data (e.g., answer places have no limits).
  # Used by RAG.
  TOOLFORMER_TABLE = 'toolformer_table'


class Clients(str, Enum):
  DEFAULT = 'default'


SDG_DC_LIST = [DCNames.SDG_DC, DCNames.SDG_MINI_DC]
UNDATA_DC_LIST = [
    DCNames.UNDATA_DC, DCNames.UNDATA_DEV_DC, DCNames.UNDATA_ILO_DC
]
SPECIAL_DC_LIST = SDG_DC_LIST + UNDATA_DC_LIST


# Get the SV score threshold for the given mode.
def sv_threshold_override(dargs: DetectionArgs) -> float | None:
  if dargs.var_threshold:
    return dargs.var_threshold
  elif dargs.mode == QueryMode.STRICT:
    return constants.SV_SCORE_HIGH_CONFIDENCE_THRESHOLD
  elif dargs.mode == QueryMode.TOOLFORMER_POINT:
    return constants.SV_SCORE_TOOLFORMER_THRESHOLD
  # The default is 0, so model-score will be used.
  return 0.0


#
# A list of special backends that have common handling w.r.t
# embeddings-index, default places, etc.
#
def is_special_dc_str(dc: str) -> bool:
  return dc in SPECIAL_DC_LIST


def is_special_dc(insight_ctx: Dict) -> bool:
  return is_special_dc_str(insight_ctx.get(Params.DC.value))


def is_sdg(insight_ctx: Dict) -> bool:
  return insight_ctx.get(Params.DC.value) in SDG_DC_LIST


def is_bio(insight_ctx: Dict) -> bool:
  return insight_ctx.get(Params.DC.value) == DCNames.BIO_DC.value


def dc_to_embedding_type(dc: str, embeddings_type: str) -> str:
  if dc in SDG_DC_LIST:
    return 'sdg_ft'
  elif dc == DCNames.UNDATA_DC.value:
    return 'undata_ft'
  elif dc == DCNames.UNDATA_ILO_DC.value:
    return 'undata_ilo_ft'
  elif dc == DCNames.UNDATA_DEV_DC.value:
    return 'undata_dev_ft'
  elif dc == DCNames.BIO_DC.value:
    return 'bio_ft'
  return embeddings_type


def is_toolformer_mode(mode: QueryMode) -> bool:
  return mode == QueryMode.TOOLFORMER_POINT or mode == QueryMode.TOOLFORMER_TABLE
