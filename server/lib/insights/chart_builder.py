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

  def new_category(self, title):
    self.category = self.page_config.categories.add()
    self.category.title = title

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
  for chart_vars in chart_vars_list:
    builder.new_category(chart_vars.title)
    logging.info(f'{chart_vars.svs}')
    _add_charts(chart_vars, state, builder)
  return builder.page_config


def _add_charts(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
                builder: Builder) -> Dict:
  sv_spec = {}

  if not chart_vars.is_topic_peer_group:
    # This is going to be a new section with a list of specific charts.
    # They should not be compared.
    for sv in chart_vars.svs:
      builder.new_block(builder.sv2thing.name.get(sv))
      sv_spec.update(_add_sv_charts(sv, chart_vars, state, builder))
  else:
    builder.new_block('')
    sv_spec.update(_add_svpg_charts(chart_vars, state, builder))

  builder.update_sv_spec(sv_spec)


def _add_sv_charts(sv: str, chart_vars: ftypes.ChartVars,
                   state: ftypes.PopulateState, builder: Builder):
  sv_spec = {}
  place = state.uttr.places[0]
  attr = {
      'include_percapita': False,
      'title': chart_vars.title,
  }
  if chart_vars.has_single_point:
    sv_spec.update(
        highlight.higlight_block(builder.new_column(), sv, builder.sv2thing))
  else:
    sv_spec.update(
        timeline.single_place_single_var_timeline_block(builder.new_column(),
                                                        place, sv,
                                                        builder.sv2thing, attr,
                                                        builder.nopc()))

  if not state.place_type:
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


def _add_svpg_charts(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
                     builder: Builder):
  place = state.uttr.places[0]
  attr = {
      'include_percapita': False,
      'title': chart_vars.title,
  }
  sv_spec = {}

  if not state.place_type:
    _add_svpg_line_or_bar(chart_vars.svs, state, attr, builder, sv_spec)
    return sv_spec

  attr['skip_map_for_ranking'] = True
  attr['child_type'] = state.place_type.value
  attr['ranking_count'] = 5
  attr['ranking_types'] = [dtypes.RankingType.HIGH, dtypes.RankingType.LOW]

  # TODO: Perform data lookups and pick the top value SVs.
  sorted_svs = sorted(chart_vars.svs)[:_MAX_MAPS_PER_SUBTOPIC]

  if len(chart_vars.svs) == 2:
    # If there are 2 SVs, show:
    # MAP1 | MAP2
    # LINE | RANK
    for sv in sorted_svs:
      sv_spec.update(
          map.map_chart_block(builder.new_column(), place, sv, builder.sv2thing,
                              attr, builder.nopc()))

    _add_svpg_line_or_bar(chart_vars, state, attr, builder, sv_spec)

    sv_spec.update(
      ranking.ranking_chart_multivar(builder.new_column(),
                                     sorted_svs, builder.sv2thing, attr))
  else:
    # If there >2 SVs, show:
    # BAR  | RANK
    # MAP1 | MAP2
    _add_svpg_line_or_bar(chart_vars, state, attr, builder, sv_spec)

    sv_spec.update(
      ranking.ranking_chart_multivar(builder.new_column(),
                                     sorted_svs, builder.sv2thing, attr))

    for sv in sorted_svs:
      sv_spec.update(
          map.map_chart_block(builder.new_column(), place, sv, builder.sv2thing,
                              attr, builder.nopc()))

  return sv_spec


def _add_svpg_line_or_bar(chart_vars: ftypes.ChartVars,
                          state: ftypes.PopulateState,
                          attr: Dict,
                          builder: Builder,
                          sv_spec: Dict):
  # Add timeline and/or bar charts.
  if (len(chart_vars.svs) <= _MAX_VARS_PER_TIMELINE_CHART and
      not chart_vars.has_single_point):
    sv_spec.update(
        timeline.single_place_multiple_var_timeline_block(
            builder.new_column(), state.uttr.places[0],
            chart_vars.svs, builder.sv2thing, attr,
            builder.nopc()))
  else:
    sv_spec.update(
        bar.multiple_place_bar_block(builder.new_column(), state.uttr.places,
                                     chart_vars.svs, builder.sv2thing, attr,
                                     builder.nopc()))
