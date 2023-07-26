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

import logging
import time
from typing import Dict, List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.nl.common import variable
from server.lib.nl.config_builder import bar
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder import builder
from server.lib.nl.config_builder import highlight
from server.lib.nl.config_builder import map
from server.lib.nl.config_builder import ranking
from server.lib.nl.config_builder import timeline
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.context as ctx
import server.lib.nl.fulfillment.types as ftypes

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_TIMELINE_CHART = 5
_MAX_MAPS_PER_SUBTOPIC = 2


class Builder:

  def __init__(self, state: ftypes.PopulateState, env_config: builder.Config,
               sv2thing: base.SV2Thing):
    self.uttr = state.uttr
    self.page_config = SubjectPageConfig()
    self.env_config = env_config
    self.sv2thing = sv2thing

    self.is_place_comparison = False
    if len(state.uttr.places) > 1:
      if ctx.classifications_of_type_from_utterance(
          state.uttr, dtypes.ClassificationType.COMPARISON):
        self.is_place_comparison = True
    metadata = self.page_config.metadata
    main_place = state.uttr.places[0]
    metadata.place_dcid.append(main_place.dcid)
    if state.place_type:
      metadata.contained_place_types[main_place.place_type] = \
        state.place_type.value

    self.category = None
    self.block = None
    self.column = None

  def nopc(self):
    return self.env_config.nopc_vars

  def new_category(self, title, dcid):
    self.category = self.page_config.categories.add()
    self.category.title = title
    if dcid:
      self.category.dcid = dcid

  def new_block(self, title, description=''):
    self.block = self.category.blocks.add()
    self.block.title = base.decorate_block_title(title=title)
    if description:
      self.block.description = description

  def new_column(self):
    self.column = self.block.columns.add()
    return self.column

  def update_sv_spec(self, stat_var_spec_map):
    for sv_key, spec in stat_var_spec_map.items():
      self.category.stat_var_spec[sv_key].CopyFrom(spec)

  # 1. If there are duplicate charts, drops the subsequent tiles.
  # 2. As a result of the dedupe if any column, block or category
  #    is empty, deletes it.
  # 3. Finally, if there is a singleton block in a category and both
  #    the block and category have names, drop the block name.
  def cleanup_config(self):
    # From inside to out, delete duplicate charts and cleanup
    # any empties.
    chart_keys = set()
    out_cats = []
    for cat in self.page_config.categories:
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
    del self.page_config.categories[:]
    if out_cats:
      self.page_config.categories.extend(out_cats)

    for cat in self.page_config.categories:
      if len(cat.blocks) == 1 and cat.title and cat.blocks[0].title:
        # Note: Category title will be topic name and block title
        # will be SVPG.  The latter is better curated, so for now
        # use that.
        # TODO: Revisit after topic names are better.
        cat.title = cat.blocks[0].title
        cat.blocks[0].title = ''


def build(chart_vars_list: List[ftypes.ChartVars], state: ftypes.PopulateState,
          all_svs: List[str], env_config: builder.Config) -> SubjectPageConfig:
  # Get names of all SVs
  start = time.time()
  sv2thing = base.SV2Thing(
      name=variable.get_sv_name(all_svs, env_config.sv_chart_titles),
      unit=variable.get_sv_unit(all_svs),
      description=variable.get_sv_description(all_svs),
      footnote=variable.get_sv_footnote(all_svs),
  )
  state.uttr.counters.timeit('get_sv_details', start)

  builder = Builder(state, env_config, sv2thing)

  prev_topic = None
  for i, chart_vars in enumerate(chart_vars_list):
    # The chart_vars will be ordered, so add a new category for
    # every distinct source-topic.
    if i == 0 or prev_topic != chart_vars.source_topic:
      title = ''
      dcid = ''
      if chart_vars.title:
        title = chart_vars.title
      elif chart_vars.source_topic:
        title = sv2thing.name.get(chart_vars.source_topic, '')
        dcid = chart_vars.source_topic
      builder.new_category(title, dcid)
      prev_topic = chart_vars.source_topic
    _add_charts(chart_vars, state, builder)

  builder.cleanup_config()
  return builder.page_config


def _add_charts(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
                builder: Builder) -> Dict:
  sv_spec = {}

  if not chart_vars.is_topic_peer_group:
    # This is going to be a new section with a list of specific charts.
    # They should not be compared.
    for sv in chart_vars.svs:
      builder.new_block(builder.sv2thing.name.get(sv))
      if builder.is_place_comparison:
        sv_spec.update(_add_sv_comparison(sv, chart_vars, state, builder))
      else:
        sv_spec.update(_add_sv_charts(sv, chart_vars, state, builder))
  else:
    if not chart_vars.title and chart_vars.svpg_id:
      # If there was an SVPG, we may not have gotten its name before, so get it now.
      chart_vars.title = builder.sv2thing.name.get(chart_vars.svpg_id, '')
    builder.new_block(chart_vars.title)
    if builder.is_place_comparison:
      sv_spec.update(_add_svpg_comparison(chart_vars, state, builder))
    else:
      sv_spec.update(_add_svpg_charts(chart_vars, state, builder))

  builder.update_sv_spec(sv_spec)


def _add_sv_comparison(sv: str, chart_vars: ftypes.ChartVars,
                       state: ftypes.PopulateState, builder: Builder):
  sv_spec = {}
  places = state.uttr.places

  attr = {
      'include_percapita': False,
      'title': chart_vars.title,
  }

  # Main SV existence checks.
  exist_places = [p for p in places if p.dcid in state.exist_checks.get(sv, {})]
  # Main existence check
  if len(exist_places) <= 1:
    return {}
  sv_spec.update(
      bar.multiple_place_bar_block(builder.new_column(), exist_places, [sv],
                                   builder.sv2thing, attr, builder.nopc()))

  return sv_spec


def _add_sv_charts(sv: str, chart_vars: ftypes.ChartVars,
                   state: ftypes.PopulateState, builder: Builder):
  sv_spec = {}
  place = state.uttr.places[0]

  attr = {
      'include_percapita': False,
      'title': chart_vars.title,
  }

  # Main existence check
  has_main_place = (place.dcid in state.exist_checks.get(sv, {}))
  if has_main_place:
    has_single_point = state.exist_checks[sv][place.dcid]
    if has_single_point:
      sv_spec.update(
          highlight.higlight_block(builder.new_column(), place, sv,
                                   builder.sv2thing))
    else:
      sv_spec.update(
          timeline.single_place_single_var_timeline_block(
              builder.new_column(), place, sv, builder.sv2thing, attr,
              builder.nopc()))

  if not state.place_type:
    return sv_spec

  # Child existence check
  place_key = place.dcid + state.place_type.value
  has_child_place = (place_key in state.exist_checks.get(sv, {}))
  if not has_child_place:
    return sv_spec

  attr['child_type'] = state.place_type.value
  attr['skip_map_for_ranking'] = True
  attr['ranking_count'] = 0

  sv_spec.update(
      map.map_chart_block(builder.new_column(), place, sv, builder.sv2thing,
                          attr, builder.nopc()))
  attr['ranking_types'] = [dtypes.RankingType.HIGH, dtypes.RankingType.LOW]
  sv_spec.update(
      ranking.ranking_chart_multivar(builder.new_column(), [sv],
                                     builder.sv2thing, attr))
  return sv_spec


def _add_svpg_comparison(chart_vars: ftypes.ChartVars,
                         state: ftypes.PopulateState, builder: Builder):
  places = state.uttr.places
  attr = {
      'include_percapita': False,
      'title': chart_vars.title,
  }
  sv_spec = {}

  # Pick SVs that satisfy all places.
  exist_svs = []
  for sv in chart_vars.svs:
    if all([p.dcid in state.exist_checks.get(sv, {}) for p in places]):
      exist_svs.append(sv)
  sv_spec.update(
      bar.multiple_place_bar_block(builder.new_column(), places, exist_svs,
                                   builder.sv2thing, attr, builder.nopc()))
  return sv_spec


def _add_svpg_charts(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
                     builder: Builder):
  place = state.uttr.places[0]
  attr = {
      'include_percapita': False,
      'title': chart_vars.title,
  }
  sv_spec = {}

  # Main SV existence checks.
  exist_main_svs = [
      sv for sv in chart_vars.svs
      if place.dcid in state.exist_checks.get(sv, {})
  ]
  if exist_main_svs:
    # If any of them has single-point
    has_single_point = any(
        [state.exist_checks[sv][place.dcid] for sv in exist_main_svs])
    _add_svpg_line_or_bar(exist_main_svs, has_single_point, state, attr,
                          builder, sv_spec)

  if not state.place_type:
    return sv_spec

  # Child SV existence checks.
  place_key = place.dcid + state.place_type.value
  exist_child_svs = [
      sv for sv in chart_vars.svs
      if place_key in state.exist_checks.get(sv, {})
  ]
  if not exist_child_svs:
    return sv_spec

  attr['skip_map_for_ranking'] = True
  attr['child_type'] = state.place_type.value
  attr['ranking_count'] = 5
  attr['ranking_types'] = [dtypes.RankingType.HIGH, dtypes.RankingType.LOW]

  # TODO: Perform data lookups and pick the top value SVs.
  sorted_child_svs = sorted(exist_child_svs)[:_MAX_MAPS_PER_SUBTOPIC]

  sv_spec.update(
      ranking.ranking_chart_multivar(builder.new_column(), sorted_child_svs,
                                     builder.sv2thing, attr))

  for sv in sorted_child_svs:
    sv_spec.update(
        map.map_chart_block(builder.new_column(), place, sv, builder.sv2thing,
                            attr, builder.nopc()))

  return sv_spec


def _add_svpg_line_or_bar(svs: List[str], has_single_point: bool,
                          state: ftypes.PopulateState, attr: Dict,
                          builder: Builder, sv_spec: Dict):
  # Add timeline and/or bar charts.
  if (len(svs) <= _MAX_VARS_PER_TIMELINE_CHART and not has_single_point):
    sv_spec.update(
        timeline.single_place_multiple_var_timeline_block(
            builder.new_column(), state.uttr.places[0], svs, builder.sv2thing,
            attr, builder.nopc()))
  else:
    sv_spec.update(
        bar.multiple_place_bar_block(builder.new_column(), state.uttr.places,
                                     svs, builder.sv2thing, attr,
                                     builder.nopc()))
