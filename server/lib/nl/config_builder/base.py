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

from dataclasses import dataclass
import logging
from typing import Dict

from server.config.subject_page_pb2 import Block
from server.config.subject_page_pb2 import SubjectPageConfig
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartSpec
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import QueryType
from server.lib.nl.common.utterance import TimeDeltaType
from server.lib.nl.detection.types import Place


class Builder:

  def __init__(self, uttr):
    self.uttr = uttr
    self.page_config = SubjectPageConfig()

    metadata = self.page_config.metadata
    first_chart = uttr.rankedCharts[0]
    main_place = first_chart.places[0]
    metadata.place_dcid.append(main_place.dcid)
    if (first_chart.chart_type == ChartType.MAP_CHART or
        first_chart.chart_type == ChartType.RANKING_CHART or
        first_chart.chart_type == ChartType.SCATTER_CHART):
      metadata.contained_place_types[main_place.place_type] = \
        first_chart.attr['place_type']

    self.category = self.page_config.categories.add()
    self.block = None
    self.column = None
    self.prev_block_id = -1

    self.ignore_block_id_check = False
    if (uttr.query_type == QueryType.RANKING_ACROSS_PLACES or
        uttr.query_type == QueryType.TIME_DELTA_ACROSS_PLACES or
        uttr.query_type == QueryType.TIME_DELTA_ACROSS_VARS or
        uttr.query_type == QueryType.FILTER_WITH_SINGLE_VAR or
        uttr.query_type == QueryType.FILTER_WITH_DUAL_VARS):
      self.ignore_block_id_check = True

  # Returns a Block and a Column
  def new_chart(self, attr: Dict) -> any:
    block_id = attr['block_id']
    if block_id != self.prev_block_id or self.ignore_block_id_check:
      if self.block:
        self.category.blocks.append(self.block)
      self.block = Block()
      if attr['title']:
        self.block.title = decorate_block_title(title=attr['title'],
                                                chart_origin=attr.get(
                                                    'class', None))
      if attr['description']:
        self.block.description = attr['description']
      self.column = self.block.columns.add()
      self.prev_block_id = block_id
    return self.block, self.column

  def update_sv_spec(self, stat_var_spec_map):
    for sv_key, spec in stat_var_spec_map.items():
      self.category.stat_var_spec[sv_key].CopyFrom(spec)

  def finalize(self) -> SubjectPageConfig:
    if self.block:
      self.category.blocks.append(self.block)
      self.block = None


# A structure with maps from SV DCID to different things.
@dataclass
class SV2Thing:
  name: Dict
  unit: Dict
  description: Dict
  footnote: Dict


def decorate_block_title(title: str,
                         do_pc: bool = False,
                         chart_origin: ChartOriginType = None,
                         growth_direction: TimeDeltaType = None,
                         growth_ranking_type: str = '') -> str:
  if growth_direction != None:
    if growth_direction == TimeDeltaType.INCREASE:
      prefix = 'Increase'
    else:
      prefix = 'Decrease'
    suffix = 'over time '
    if growth_ranking_type == 'abs':
      suffix += '(Absolute change)'
    elif growth_ranking_type == 'pct':
      suffix += '(Percent change)'
    elif growth_ranking_type == 'pc':
      suffix += '(Per Capita change)'
    if title:
      title = ' '.join([prefix, 'in', title, suffix])
    else:
      title = prefix + ' ' + suffix

  if not title:
    return ''

  if do_pc:
    title = 'Per Capita ' + title

  if chart_origin == ChartOriginType.SECONDARY_CHART:
    title = 'Related: ' + title

  return title


def decorate_chart_title(title: str,
                         place: Place,
                         add_date: bool = False,
                         do_pc: bool = False,
                         child_type: str = '',
                         title_suffix: str = '') -> str:
  if not title:
    return ''

  # Apply in order: place or place+containment, per-capita, related prefix
  if place and place.name:
    if place.dcid == 'Earth':
      title = title + ' in the World'
    else:
      if child_type:
        title = title + ' in ' + utils.pluralize_place_type(
            child_type) + ' of ' + place.name
      else:
        title = title + ' in ' + place.name

  if do_pc:
    title = 'Per Capita ' + title

  if add_date:
    title = title + ' (${date})'

  if title_suffix:
    title += ' - ' + title_suffix

  return title


def is_sv_percapita(sv_name: str, sv_dcid: str) -> bool:
  # Check both names and dcids because per capita indicating word may be in one
  # or the other.
  for per_capita_indicator in ["Percent", "Prevalence"]:
    for sv_string in [sv_name, sv_dcid]:
      if per_capita_indicator in sv_string:
        return True
  return False


def is_map_or_ranking_compatible(cspec: ChartSpec) -> bool:
  if len(cspec.places) > 1:
    logging.error('Incompatible MAP/RANKING: too-many-places ', cspec)
    return False
  if 'place_type' not in cspec.attr or not cspec.attr['place_type']:
    logging.error('Incompatible MAP/RANKING: missing-place-type', cspec)
    return False
  return True


def place_overview_block(column):
  tile = column.tiles.add()
  tile.type = Tile.TileType.PLACE_OVERVIEW
