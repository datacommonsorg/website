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
from typing import Dict, List

from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.detection.types import ContainedInPlaceType
from server.lib.nl.detection.types import Date
from server.lib.nl.detection.types import Entity
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
# 4) orig_sv_map: the user-specified topic/sv is the key.
#    this is used to decide the "main" topic for the page.
@dataclass
class ChartVars:
  # Only one of svs, props, or events is set.
  svs: List[str] = field(default_factory=list)
  props: List[str] = field(default_factory=list)
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
  # Only correlation query has 2 keys (and singleton values), for the
  # rest there should only be one key (and list of 1 or more values).
  orig_sv_map: Dict[str, List[str]] = field(default_factory=dict)

  # Relevant only when chart_type is RANKED_TIMELINE_COLLECTION
  growth_direction: TimeDeltaType = None
  growth_ranking_type: str = None

  # Set if is_topic_peer_group is set.
  svpg_id: str = ''
  # Skips adding an overview tile for ANSWER_WITH_ENTITY_OVERVIEW chart type.
  skip_overview_for_entity_answer: bool = False


@dataclass
class SV2Thing:
  name: Dict
  unit: Dict
  description: Dict
  footnote: Dict


@dataclass
class ExistInfo:
  is_single_point: bool = False
  # Facet metadata where keys are metadata keys and values are metadata values.
  # Keys include 'facetId'. 'earliestDate', 'latestDate', and optional 'unit'
  # and 'observationPeriod'.
  facet: Dict[str, str] = field(default_factory=dict)
  # Latest valid date that there exists data for. This is only used and only set
  # when there is a date/date range asked for in the query.
  latest_valid_date: str = ''


# Data structure to store state for a single "populate" call.
@dataclass
class PopulateState:
  uttr: Utterance
  place_type: ContainedInPlaceType = None
  # Set to true if `place_type` at the outset of fulfillment was
  # DEFAULT_TYPE.
  had_default_place_type: bool = False
  ranking_types: List[RankingType] = field(default_factory=list)
  time_delta_types: List[TimeDeltaType] = field(default_factory=list)
  quantity: QuantityClassificationAttributes = None
  # A single specified date to get data for.
  single_date: Date = None
  # A date range to get data for. Only one of this or single_date should be set.
  # If single_date is set, this will be ignored.
  date_range: Date = None
  event_types: List[EventType] = field(default_factory=list)
  disable_fallback: bool = False
  # The list of chart-vars to process.  This is keyed by var / topic.
  # This is in the order of the returned SVs from the Embeddings index.
  chart_vars_map: Dict[str, List[ChartVars]] = field(default_factory=dict)
  # This is a temporary subset of `chart_vars_map` that have passed existence
  # checks.
  exist_chart_vars_list: List[ChartVars] = field(default_factory=list)
  # Places to do existence check on.
  #
  # Dict's key is the DCID of the place to check.  Dict's value is a group-by key
  # used for recognizing child places.
  places_to_check: Dict[str, str] = field(default_factory=dict)
  # Var to names/descriptions/etc.
  sv2thing: SV2Thing = None
  # Ordered list of query types.
  query_types: List[QueryType] = field(default_factory=list)
  # Has the results of existence check.
  # SV -> Place Keys -> Existence info
  # Where Place Key may be the place DCID, or place DCID + child-type.
  exist_checks: Dict[str, Dict[str, ExistInfo]] = field(default_factory=dict)
  # Set to true if utterance has overwritten SVs.  So they should
  # be cleared and not be propagated into context.
  has_overwritten_svs: bool = False
  # Set to true if TOP charts include requested child-type for
  # BASIC.  This is a hack around the fact that BASIC type combines
  # contained-in, ranking and simple.
  has_child_type_in_top_basic_charts: bool = False


# Dict of place dcid -> facet metadata which includes information like facetId,
# earliestDate, and latestDate
Place2Facet = Dict[str, Dict[str, str]]
# Dict of sv dcid -> place dcid -> facet metadata
Sv2Place2Facet = Dict[str, Place2Facet]
# Dict of place key -> date
Place2Date = Dict[str, str]
# Dict of sv dcid -> place key -> date
Sv2Place2Date = Dict[str, Place2Date]


@dataclass
class ChartSpec:
  chart_type: ChartType
  places: List[Place]
  entities: List[Entity]
  svs: List[str]
  props: List[str]
  event: EventType
  chart_vars: ChartVars
  place_type: str
  ranking_types: List[RankingType]
  ranking_count: int
  chart_origin: ChartOriginType
  is_special_dc: bool
  single_date: Date
  date_range: Date
  # Dict of sv -> place -> facet metadata to use.
  # This is used by timeline charts when there is a date/date range in the query
  sv_place_facet: Sv2Place2Facet
  info_message: str
  # Dict of sv -> place key -> latest valid date
  # This is used by charts that show a single data point (e.g., bar, map,
  # ranking, highlight, scatter) when there is a date range in the query
  sv_place_latest_date: Sv2Place2Date
