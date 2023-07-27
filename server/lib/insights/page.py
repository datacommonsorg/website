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

import time
from typing import Dict, List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.insights.page_type import default
from server.lib.insights.page_type import place_comparison
from server.lib.insights.page_type.builder import Builder
from server.lib.nl.common import variable
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder import builder
import server.lib.nl.fulfillment.types as ftypes


def build_config(chart_vars_list: List[ftypes.ChartVars],
                 state: ftypes.PopulateState, all_svs: List[str],
                 env_config: builder.Config) -> SubjectPageConfig:
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
        sv_spec.update(place_comparison.add_sv(sv, chart_vars, state, builder))
      else:
        sv_spec.update(default.add_sv(sv, chart_vars, state, builder))
  else:
    if not chart_vars.title and chart_vars.svpg_id:
      # If there was an SVPG, we may not have gotten its name before, so get it now.
      chart_vars.title = builder.sv2thing.name.get(chart_vars.svpg_id, '')
    builder.new_block(chart_vars.title)
    if builder.is_place_comparison:
      sv_spec.update(place_comparison.add_svpg(chart_vars, state, builder))
    else:
      sv_spec.update(default.add_svpg(chart_vars, state, builder))

  builder.update_sv_spec(sv_spec)
