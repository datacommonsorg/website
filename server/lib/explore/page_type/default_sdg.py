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

import server.lib.explore.existence as exist
from server.lib.explore.page_type.builder import Builder
from server.lib.explore.page_type.default_main import add_svpg_line_or_bar
from server.lib.nl.common import utils
from server.lib.nl.config_builder import gauge
from server.lib.nl.config_builder import highlight
from server.lib.nl.config_builder import map
from server.lib.nl.config_builder import timeline
import server.lib.nl.fulfillment.types as ftypes

_MAX_MAPS_PER_SUBTOPIC_LOWER = 2
_MAX_MAPS_PER_SUBTOPIC_UPPER = 10


def add_sv(sv: str, chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
           builder: Builder):
  sv_spec = {}
  place = state.uttr.places[0]

  # Main existence check
  eres = exist.svs4place(state, place, [sv])
  if eres.exist_svs:
    #    TODO: Re-enable after fixing sizing issue
    #    if sv in builder.env_config.sdg_percent_vars:
    #      sv_spec.update(
    #          gauge.gauge_block_for_percent(builder.new_column(chart_vars), place,
    #                                        sv, builder.sv2thing))
    #    else:
    sv_spec.update(
        highlight.higlight_block(builder.new_column(chart_vars), place, sv,
                                 builder.sv2thing))
    builder.new_block()
    if not eres.is_single_point:
      sv_spec.update(
          timeline.single_place_single_var_timeline_block(
              builder.new_column(chart_vars), place, sv, builder.sv2thing))
      builder.new_block()

  if not state.place_type:
    return sv_spec

  # Child existence check
  if not exist.svs4children(state, place, [sv]).exist_svs:
    return sv_spec

  if utils.has_map(state.place_type, [place]):
    sv_spec.update(
        map.map_chart_block(column=builder.new_column(chart_vars),
                            place=place,
                            pri_sv=sv,
                            child_type=state.place_type.value,
                            sv2thing=builder.sv2thing,
                            cv=chart_vars,
                            nopc_vars=builder.nopc()))
    builder.new_block()
  return sv_spec


def add_svpg(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
             builder: Builder):
  place = state.uttr.places[0]

  sv_spec = {}

  # Main SV existence checks.
  eres = exist.svs4place(state, place, chart_vars.svs)
  if eres.exist_svs:
    # If any of them has single-point
    add_svpg_line_or_bar(chart_vars, eres.exist_svs, eres.is_single_point,
                         state, builder, sv_spec)
    builder.new_block()

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
  for sv in sorted_child_svs:
    if utils.has_map(state.place_type, [place]):
      sv_spec.update(
          map.map_chart_block(column=builder.new_column(chart_vars),
                              place=place,
                              pri_sv=sv,
                              child_type=state.place_type.value,
                              cv=chart_vars,
                              sv2thing=builder.sv2thing,
                              nopc_vars=builder.nopc()))
      builder.new_block()

  return sv_spec
