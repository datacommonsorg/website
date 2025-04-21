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
import re
from typing import Dict, Set, Tuple

from flask import current_app

from server.config.subject_page_pb2 import Block
from server.config.subject_page_pb2 import SubjectPageConfig
from server.config.subject_page_pb2 import Tile
from server.lib.nl.common import utils
from server.lib.nl.common.utterance import ChartOriginType
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
import server.lib.nl.common.variable as var_lib
import server.lib.nl.config_builder.formatting_utils as formatting
from server.lib.nl.detection.types import ClassificationType
from server.lib.nl.detection.types import Place
from server.lib.nl.detection.types import TimeDeltaType
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import SV2Thing
import server.lib.nl.fulfillment.utils as futils

_OUT_ARROW = '->'
_IN_ARROW = '<-'


# Config structures.
@dataclass
class Config:
  event_config: SubjectPageConfig
  sv_chart_titles: Dict
  nopc_vars: Set[str]
  sdg_percent_vars: Set[str]


# A structure with maps from SV DCID to different things.
class Builder:

  def __init__(self, uttr: Utterance, sv2thing: SV2Thing, config: Config):
    self.uttr = uttr
    self.page_config = SubjectPageConfig()
    self.sv2thing = sv2thing
    self.config = config

    metadata = self.page_config.metadata
    # TODO: Revisit this choice.
    if uttr.rankedCharts[0].places:
      main_place = uttr.rankedCharts[0].places[0]
      metadata.place_dcid.append(main_place.dcid)
      for ch in uttr.rankedCharts:
        if ch.chart_type in [ChartType.MAP_CHART, ChartType.RANKING_WITH_MAP, ChartType.SCATTER_CHART]:
          metadata.contained_place_types[main_place.place_type] = ch.place_type
          break

    self.category = self.page_config.categories.add()
    self.block = None
    self.column = None
    if futils.classifications_of_type(uttr.classifications,
                                      ClassificationType.PER_CAPITA):
      self.default_per_capita = True
    else:
      self.default_per_capita = False

  # Returns a Block and a Column
  def new_chart(self,
                cspec: ChartSpec,
                override_sv: str = '',
                skip_title: bool = False,
                place: Place = None,
                child_type: str = '') -> any:
    cv = cspec.chart_vars
    if self.block:
      self.category.blocks.append(self.block)
    self.block = Block()
    self.block.info_message = cspec.info_message

    if not skip_title:
      title, description, footnote = self.get_block_strings(cv, override_sv)
      if title:
        self.block.title = decorate_block_title(title=title,
                                                chart_origin=cspec.chart_origin,
                                                place=place,
                                                child_type=child_type)
      if description:
        self.block.description = description

      if footnote:
        self.block.footnote = footnote

    if cv.svs and self.enable_pc(cv):
      self.block.denom = 'Count_Person'
      if self.default_per_capita:
        self.block.start_with_denom = True

    return self.block

  def enable_pc(self, cv: ChartVars) -> bool:
    return all([
        var_lib.is_percapita_relevant(v, self.config.nopc_vars) for v in cv.svs
    ])

  # Returns title, description and footnote for a block.
  def get_block_strings(self,
                        cv: ChartVars,
                        override_sv: str = '') -> Tuple[str, str, str]:
    title, description, footnote = _process_title_desc_footnote(
        self, cv, override_sv)
    return formatting.make_title_case(title), formatting.make_sentence_case(
        description), formatting.make_sentence_case(footnote)

  def update_sv_spec(self, stat_var_spec_map):
    for sv_key, spec in stat_var_spec_map.items():
      self.category.stat_var_spec[sv_key].CopyFrom(spec)

  def finalize(self) -> SubjectPageConfig:
    if self.block:
      self.category.blocks.append(self.block)
      self.block = None
    trim_config(self.page_config)


def decorate_block_title(title: str,
                         chart_origin: ChartOriginType = None,
                         growth_direction: TimeDeltaType = None,
                         growth_ranking_type: str = '',
                         place: Place = None,
                         child_type: str = '') -> str:
  if growth_direction != None:
    if growth_direction == TimeDeltaType.INCREASE:
      prefix = 'Increase'
    elif growth_direction == TimeDeltaType.DECREASE:
      prefix = 'Decrease'
    elif growth_direction == TimeDeltaType.CHANGE:
      prefix = 'Change'
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

  if place and place.name:
    if place.dcid == 'Earth':
      title = title + ' in the World'
    else:
      if child_type:
        title = title + ' in ' + utils.pluralize_place_type(
            child_type) + ' of ' + place.name
      else:
        title = title + ' in ' + place.name

  if chart_origin == ChartOriginType.SECONDARY_CHART:
    title = 'Related: ' + title

  # Return in title case.
  return formatting.make_title_case(title)


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

  # Use title case. Note, this needs to happend before
  # the following line which could add '(${date})' where
  # we don't want to capitalize 'date'.
  title = formatting.make_title_case(title)

  if add_date:
    title = title + ' (${date})'

  if title_suffix:
    title += ' - ' + formatting.make_title_case(title_suffix)

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
    return False
  if not cspec.place_type:
    return False
  return True


def place_overview_block(column):
  tile = column.tiles.add()
  tile.type = Tile.TileType.PLACE_OVERVIEW


def entity_overview_block(column, entity):
  tile = column.tiles.add()
  tile.type = Tile.TileType.ENTITY_OVERVIEW
  tile.entities.extend([entity.dcid])


# Delete duplicate charts and cleanup any empties.
def trim_config(page_config: SubjectPageConfig):
  chart_keys = set()
  out_cats = []
  for cat in page_config.categories:
    out_blks = []
    for blk in cat.blocks:
      out_cols = []
      for col in blk.columns:
        out_tiles = []
        for tile in col.tiles:
          x = tile.SerializeToString()
          if x not in chart_keys:
            out_tiles.append(tile)
          chart_keys.add(x)
        del col.tiles[:]
        if out_tiles:
          col.tiles.extend(out_tiles)
          out_cols.append(col)
      del blk.columns[:]
      if out_cols:
        blk.columns.extend(out_cols)
        out_blks.append(blk)
    del cat.blocks[:]
    if out_blks:
      cat.blocks.extend(out_blks)
      out_cats.append(cat)
  del page_config.categories[:]
  if out_cats:
    page_config.categories.extend(out_cats)


def _process_title_desc_footnote(builder: Builder,
                                 cv: ChartVars,
                                 override_sv: str = '') -> Tuple[str, str, str]:
  title, description, footnote = '', '', ''

  if override_sv:
    title = builder.sv2thing.name.get(override_sv, '')
    description = builder.sv2thing.description.get(override_sv, '')
    footnote = builder.sv2thing.footnote.get(override_sv, '')
    return title, description, footnote

  if cv.title:
    title = cv.title
    description = cv.description
  elif cv.svpg_id:
    title = builder.sv2thing.name.get(cv.svpg_id, '')
    description = builder.sv2thing.description.get(cv.svpg_id, '')
    footnote = builder.sv2thing.footnote.get(cv.svpg_id, '')
  elif len(cv.svs) == 1:
    title = builder.sv2thing.name.get(cv.svs[0], '')
    description = builder.sv2thing.description.get(cv.svs[0], '')
    footnote = builder.sv2thing.footnote.get(cv.svs[0], '')
  elif len(cv.svs) > 1 and builder.sv2thing.name.get(cv.svs[0]):
    title = formatting.title_for_two_or_more_svs(cv.svs, builder.sv2thing.name)
  return title, description, footnote


# Gets the display name to use for a property expression
def get_property_display_name(prop_expression: str) -> str:
  override_prop_titles = current_app.config['NL_PROP_TITLES']
  # try to get display name from override_prop_titles
  display_name = override_prop_titles.get(prop_expression,
                                          {}).get('displayName', '')

  # If display name was not found in override prop titles, process the prop
  # expression into a display name
  if not display_name:
    display_name = prop_expression
    # remove any arrows from the display name
    if display_name.startswith(_IN_ARROW) or display_name.startswith(
        _OUT_ARROW):
      display_name = display_name[len(_IN_ARROW):]
    # break camelCase names into individual words with spaces
    # e.g., dateCreated becomes date Created
    display_name = re.sub(r'((?<=[a-z])[A-Z]|(?<!\A)[A-Z](?=[a-z]))', r' \1',
                          display_name)
    # capitalize the first letter without changing the rest of the string
    # e.g., chembl ID will become Chembl ID
    display_name = display_name[0].upper() + display_name[1:]
  return display_name
