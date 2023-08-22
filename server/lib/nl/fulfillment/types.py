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

from collections import OrderedDict
from dataclasses import dataclass
from dataclasses import field
from typing import Dict, List, Set

from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import EventType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import QuantityClassificationAttributes
from server.lib.nl.detection.types import RankingType
from server.lib.nl.detection.types import TimeDeltaType


# Data structure for configuring the vars that go into a chart.
#
# In Explore, worth noting the different sv/topic/svpg things
# in use:
# 1) svs: the ones going into a chart
# 2) source_topic: the topic that the `svs` belong to, used
#    to decide the chart category.
# 3) svpg_id: if the svs belong to a peer-group, this is set
#    and used to infer the title of a bar/timeline chart.
# 4) orig_sv: this is the user-specified topic/sv. this is
#    used to decide the "main" topic for the page.
@dataclass
class ChartVars:
  # Only one of svs or events is set.
  svs: List[str] = field(default_factory=list)
  # Represents a grouping of charts on the resulting display.
  title: str = ""
  description: str = ""
  title_suffix: str = ""
  # Represents a peer-group of SVs from a Topic.
  is_topic_peer_group: bool = False
  # If svs came from a topic, the topic dcid.
  source_topic: str = ""
  event: EventType = None
  skip_map_for_ranking: bool = False
  # When `svs` has multiple entries and corresponds to expansion, this represents
  # the original SV.
  orig_sv: str = ""

  # Relevant only when chart_type is RANKED_TIMELINE_COLLECTION
  growth_direction: TimeDeltaType = None
  growth_ranking_type: str = None

  # Set if is_topic_peer_group is set.
  svpg_id: str = ''


# Data structure to store state for a single "populate" call.
@dataclass
class PopulateState:
  uttr: Utterance
  place_type: ContainedInPlaceType = None
  ranking_types: List[RankingType] = field(default_factory=list)
  time_delta_types: List[TimeDeltaType] = field(default_factory=list)
  quantity: QuantityClassificationAttributes = None
  event_types: List[EventType] = field(default_factory=list)
  disable_fallback: bool = False
  # The list of chart-vars to process.  This is keyed by var / topic.
  # This is in the order of the returned SVs from the Embeddings index.
  chart_vars_map: OrderedDict[str,
                              List[ChartVars]] = field(default_factory=dict)
  # Ordered list of query types.
  query_types: List[QueryType] = field(default_factory=list)
  # Has the results of existence check.
  # SV -> Place Keys
  # Where Place Key may be the place DCID, or place DCID + child-type.
  exist_checks: Dict[str, Set[str]] = field(default_factory=dict)
  # Whether this is explore mode of fulfillment.
  explore_mode: bool = False


@dataclass
class ChartSpec:
  chart_type: ChartType
  places: List[Place]
  svs: List[str]
  event: EventType
  chart_vars: ChartVars
  place_type: str
  ranking_types: List[RankingType]
  ranking_count: int
  chart_origin: ChartOriginType
