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

# Chart structure for the default Explore page

from typing import Dict, List

import server.lib.explore.existence as exist
from server.lib.explore.page_type.builder import Builder
from server.lib.nl.common import utils
from server.lib.nl.config_builder import bar
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder import highlight
from server.lib.nl.config_builder import map
from server.lib.nl.config_builder import ranking
from server.lib.nl.config_builder import timeline
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.types as ftypes

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_TIMELINE_CHART = 5
_MAX_MAPS_PER_SUBTOPIC_LOWER = 2
_MAX_MAPS_PER_SUBTOPIC_UPPER = 10


def add_sv(sv: str, chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
           builder: Builder, enable_pc: bool):
  sv_spec = {}
  place = state.uttr.places[0]

  # Main existence check
  eres = exist.svs4place(state, place, [sv])
  if eres.exist_svs:
    if not eres.is_single_point:
      sv_spec.update(
          timeline.single_place_single_var_timeline_block(
              builder.new_column(chart_vars), place, sv, builder.sv2thing))
    sv_spec.update(
        highlight.higlight_block(builder.new_column(chart_vars), place, sv,
                                 builder.sv2thing))

  if not state.place_type:
    return sv_spec

  # Child existence check
  if not exist.svs4children(state, place, [sv]).exist_svs:
    return sv_spec

  title = base.decorate_chart_title(title=builder.sv2thing.name.get(sv),
                                    place=place,
                                    child_type=state.place_type.value)
  builder.new_block(title=title,
                    description=builder.sv2thing.description.get(sv),
                    enable_pc=enable_pc,
                    footnote=builder.sv2thing.footnote.get(sv))

  if utils.has_map(state.place_type, [place]):
    sv_spec.update(
        map.map_chart_block(column=builder.new_column(chart_vars),
                            place=place,
                            pri_sv=sv,
                            child_type=state.place_type.value,
                            sv2thing=builder.sv2thing))

  rc = _get_ranking_count_by_type(state.place_type)
  rt = [dtypes.RankingType.HIGH, dtypes.RankingType.LOW]
  sv_spec.update(
      ranking.ranking_chart_block(column=builder.new_column(chart_vars),
                                  pri_place=place,
                                  pri_sv=sv,
                                  child_type=state.place_type.value,
                                  sv2thing=builder.sv2thing,
                                  ranking_types=rt,
                                  ranking_count=rc,
                                  skip_map_for_ranking=True))
  return sv_spec


def add_svpg(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
             builder: Builder, enable_pc: bool):
  place = state.uttr.places[0]

  sv_spec = {}

  # Main SV existence checks.
  eres = exist.svs4place(state, place, chart_vars.svs)
  if eres.exist_svs:
    # If any of them has single-point
    add_svpg_line_or_bar(chart_vars, eres.exist_svs, eres.is_single_point,
                         state, builder, sv_spec)

  if not state.place_type:
    return sv_spec

  # Child SV existence checks.
  eres = exist.svs4children(state, place, chart_vars.svs)
  if not eres.exist_svs:
    return sv_spec

  if builder.num_chart_vars > 3:
    max_charts = _MAX_MAPS_PER_SUBTOPIC_LOWER
  else:
    max_charts = _MAX_MAPS_PER_SUBTOPIC_UPPER
  sorted_child_svs = sorted(eres.exist_svs)[:max_charts]

  # TODO: Perform data lookups and pick the top value SVs.
  description, footnote = '', ''
  if chart_vars.svpg_id:
    description = builder.sv2thing.description.get(chart_vars.svpg_id)
    footnote = builder.sv2thing.footnote.get(chart_vars.svpg_id)
  for sv in sorted_child_svs:
    title = base.decorate_chart_title(title=builder.sv2thing.name.get(sv),
                                      place=place,
                                      child_type=state.place_type.value)
    builder.new_block(title=title,
                      description=description,
                      enable_pc=enable_pc,
                      footnote=footnote)
    if utils.has_map(state.place_type, [place]):
      sv_spec.update(
          map.map_chart_block(column=builder.new_column(chart_vars),
                              place=place,
                              pri_sv=sv,
                              child_type=state.place_type.value,
                              sv2thing=builder.sv2thing))

    rt = [dtypes.RankingType.HIGH, dtypes.RankingType.LOW]
    rc = _get_ranking_count_by_type(state.place_type)
    sv_spec.update(
        ranking.ranking_chart_block(column=builder.new_column(chart_vars),
                                    pri_place=place,
                                    pri_sv=sv,
                                    child_type=state.place_type.value,
                                    sv2thing=builder.sv2thing,
                                    ranking_types=rt,
                                    ranking_count=rc,
                                    skip_map_for_ranking=True))

  return sv_spec


def add_svpg_line_or_bar(chart_vars: ftypes.ChartVars, svs: List[str],
                         has_single_point: bool, state: ftypes.PopulateState,
                         builder: Builder, sv_spec: Dict):
  # Add timeline and/or bar charts.
  if (len(svs) <= _MAX_VARS_PER_TIMELINE_CHART and not has_single_point):
    if len(svs) == 1:
      # If there is only 1 SV, add highlight.
      sv_spec.update(
          highlight.higlight_block(builder.new_column(chart_vars),
                                   state.uttr.places[0], svs[0],
                                   builder.sv2thing))
    sv_spec.update(
        timeline.single_place_multiple_var_timeline_block(
            builder.new_column(chart_vars), state.uttr.places[0], svs,
            builder.sv2thing, chart_vars))
  else:
    sv_spec.update(
        bar.multiple_place_bar_block(builder.new_column(chart_vars),
                                     state.uttr.places, svs, builder.sv2thing,
                                     chart_vars))


def _get_ranking_count_by_type(t: dtypes.Place):
  if t.value.endswith('School'):
    return 20
  return 5
