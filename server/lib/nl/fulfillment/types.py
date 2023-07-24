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

#
# Common types used across the fulfillers.
#

from dataclasses import dataclass
from dataclasses import field
from enum import Enum
from typing import List

from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import QuantityClassificationAttributes
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import TimeDeltaType


# Data structure to store state for a single "populate" call.
@dataclass
class PopulateState:
  uttr: Utterance
  main_cb: any
  place_type: ContainedInPlaceType = None
  ranking_types: List[RankingType] = field(default_factory=list)
  time_delta_types: List[TimeDeltaType] = field(default_factory=list)
  quantity: QuantityClassificationAttributes = None
  block_id: int = 0


class InsightType(Enum):
  CATEGORY = 1
  BLOCK = 2


# Data structure for configuring the vars that go into a chart.
@dataclass
class ChartVars:
  # Only one of svs or events is set.
  svs: List[str]
  # Represents a grouping of charts on the resulting display.
  block_id: int = -1
  include_percapita: bool = True
  title: str = ""
  description: str = ""
  title_suffix: str = ""
  # Represents a peer-group of SVs from a Topic.
  is_topic_peer_group: bool = False
  # For response descriptions. Will be inserted into either: "a <str>" or "some <str>s".
  response_type: str = ""
  # If svs came from a topic, the topic dcid.
  source_topic: str = ""
  event: EventType = None
  skip_map_for_ranking: bool = False
  # When `svs` has multiple entries and corresponds to expansion, this represents
  # the original SV.
  orig_sv: str = ""
  # Set for SIMPLE query when all SVs have only one data point.
  has_single_point: bool = False

  # Relevant only when chart_type is RANKED_TIMELINE_COLLECTION
  growth_direction: TimeDeltaType = None
  growth_ranking_type: str = None

  insight_type: InsightType = None
