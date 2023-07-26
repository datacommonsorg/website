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

# Chart structure for the default Insights page

from typing import Dict, List

from server.lib.insights.page_type.builder import Builder
from server.lib.nl.config_builder import bar
from server.lib.nl.config_builder import highlight
from server.lib.nl.config_builder import map
from server.lib.nl.config_builder import ranking
from server.lib.nl.config_builder import timeline
import server.lib.nl.detection.types as dtypes
import server.lib.nl.fulfillment.types as ftypes

# Number of variables to plot in a chart (largely Timeline chart)
_MAX_VARS_PER_TIMELINE_CHART = 5
_MAX_MAPS_PER_SUBTOPIC = 2


def add_sv(sv: str, chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
           builder: Builder):
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


def add_svpg(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
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
