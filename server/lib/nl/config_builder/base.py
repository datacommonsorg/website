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
from typing import Dict, Set

from server.config.subject_page_pb2 import Block
from server.config.subject_page_pb2 import SubjectPageConfig
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
import server.lib.nl.common.variable as var_lib
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import TimeDeltaType
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars


# Config structures.
@dataclass
class Config:
  event_config: SubjectPageConfig
  sv_chart_titles: Dict
  nopc_vars: Set[str]
  sdg_percent_vars: Set[str]


# A structure with maps from SV DCID to different things.
@dataclass
class SV2Thing:
  name: Dict
  unit: Dict
  description: Dict
  footnote: Dict


class Builder:

  def __init__(self, uttr: Utterance, sv2thing: SV2Thing, config: Config):
    self.uttr = uttr
    self.page_config = SubjectPageConfig()
    self.sv2thing = sv2thing
    self.config = config

    metadata = self.page_config.metadata
    first_chart: ChartSpec = uttr.rankedCharts[0]
    main_place = first_chart.places[0]
    metadata.place_dcid.append(main_place.dcid)
    if (first_chart.chart_type == ChartType.MAP_CHART or
        first_chart.chart_type == ChartType.RANKING_CHART or
        first_chart.chart_type == ChartType.SCATTER_CHART):
      metadata.contained_place_types[main_place.place_type] = \
        first_chart.place_type

    self.category = self.page_config.categories.add()
    self.block = None
    self.column = None

  # Returns a Block and a Column
  def new_chart(self,
                cspec: ChartSpec,
                override_sv: str = '',
                skip_title: bool = False) -> any:
    cv = cspec.chart_vars
    if self.block:
      self.category.blocks.append(self.block)
    self.block = Block()

    if not skip_title:
      title, description, footnote = self.get_block_strings(cv, override_sv)
      if title:
        self.block.title = decorate_block_title(title=title,
                                                chart_origin=cspec.chart_origin)
      if description:
        self.block.description = description

      if footnote:
        self.block.footnote = footnote

    if cv.svs and self.enable_pc(cv):
      self.block.denom = 'Count_Person'

    self.column = self.block.columns.add()
    return self.block, self.column

  def enable_pc(self, cv: ChartVars) -> bool:
    return all([
        var_lib.is_percapita_relevant(v, self.config.nopc_vars) for v in cv.svs
    ])

  # Returns title, description and footnote for a block.
  def get_block_strings(self, cv: ChartVars, override_sv: str = ''):
    title, description, footnote = '', '', ''

    if override_sv:
      title = self.sv2thing.name.get(override_sv, '')
      description = self.sv2thing.description.get(override_sv, '')
      footnote = self.sv2thing.footnote.get(override_sv, '')
      return title, description, footnote

    if cv.title:
      title = cv.title
      description = cv.description
    elif cv.svpg_id:
      title = self.sv2thing.name.get(cv.svpg_id, '')
      description = self.sv2thing.description.get(cv.svpg_id, '')
      footnote = self.sv2thing.footnote.get(cv.svpg_id, '')
    elif len(cv.svs) == 1:
      title = self.sv2thing.name.get(cv.svs[0], '')
      description = self.sv2thing.description.get(cv.svs[0], '')
      footnote = self.sv2thing.footnote.get(cv.svs[0], '')
    elif len(cv.svs) > 1 and self.sv2thing.name.get(cv.svs[0]):
      title = self.sv2thing.name[cv.svs[0]] + ' and more'
    return title, description, footnote

  def update_sv_spec(self, stat_var_spec_map):
    for sv_key, spec in stat_var_spec_map.items():
      self.category.stat_var_spec[sv_key].CopyFrom(spec)

  def finalize(self) -> SubjectPageConfig:
    if self.block:
      self.category.blocks.append(self.block)
      self.block = None


def decorate_block_title(title: str,
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

  if chart_origin == ChartOriginType.SECONDARY_CHART:
    title = 'Related: ' + title

  return title


def decorate_chart_title(title: str,
                         place: Place,
                         add_date: bool = False,
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
    logging.error(f'Incompatible MAP/RANKING: too-many-places {cspec}')
    return False
  if not cspec.place_type:
    logging.error(f'Incompatible MAP/RANKING: missing-place-type {cspec}')
    return False
  return True


def place_overview_block(column):
  tile = column.tiles.add()
  tile.type = Tile.TileType.PLACE_OVERVIEW
