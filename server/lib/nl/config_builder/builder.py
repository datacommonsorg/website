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
from typing import cast

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.nl.common import variable
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.common.utterance import Utterance
from server.lib.nl.config_builder import bar
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder import event
from server.lib.nl.config_builder import map
from server.lib.nl.config_builder import ranking
from server.lib.nl.config_builder import scatter
from server.lib.nl.config_builder import timeline
from server.lib.nl.config_builder.base import Config
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars


#
# Given an Utterance, build the final Chart config proto.
# TODO: Do fine-grained existence checks while adding charts.
#
def build(uttr: Utterance, config: Config) -> SubjectPageConfig:
  # Get names of all SVs
  all_svs = set()
  for cspec in uttr.rankedCharts:
    all_svs.update(cspec.svs)
    cv: ChartVars = cspec.chart_vars
    if cv.source_topic:
      all_svs.add(cv.source_topic)
    if cv.svpg_id:
      all_svs.add(cv.svpg_id)
    if cv.orig_sv:
      all_svs.add(cv.orig_sv)
  all_svs = list(all_svs)
  start = time.time()
  sv2thing = base.SV2Thing(
      name=variable.get_sv_name(all_svs, config.sv_chart_titles),
      unit=variable.get_sv_unit(all_svs),
      description=variable.get_sv_description(all_svs),
      footnote=variable.get_sv_footnote(all_svs),
  )
  uttr.counters.timeit('get_sv_details', start)

  builder = base.Builder(uttr, sv2thing, config)

  # Build chart blocks
  for cspec in uttr.rankedCharts:
    cspec = cast(ChartSpec, cspec)
    cv = cspec.chart_vars
    if not cspec.places:
      continue
    stat_var_spec_map = {}

    # Call per-chart handlers.
    if cspec.chart_type == ChartType.PLACE_OVERVIEW:
      place = cspec.places[0]
      block, column = builder.new_chart(cspec, skip_title=True)
      block.title = place.name
      base.place_overview_block(column)

    elif cspec.chart_type == ChartType.TIMELINE_CHART:
      _, column = builder.new_chart(cspec)
      if len(cspec.svs) > 1:
        stat_var_spec_map = timeline.single_place_multiple_var_timeline_block(
            column, cspec.places[0], cspec.svs, sv2thing, cv)
      else:
        stat_var_spec_map = timeline.single_place_single_var_timeline_block(
            column, cspec.places[0], cspec.svs[0], sv2thing)

    elif cspec.chart_type == ChartType.BAR_CHART:
      _, column = builder.new_chart(cspec)
      stat_var_spec_map = bar.multiple_place_bar_block(column, cspec.places,
                                                       cspec.svs, sv2thing, cv)

    elif cspec.chart_type == ChartType.MAP_CHART:
      if not base.is_map_or_ranking_compatible(cspec):
        continue
      block, column = None, None
      for sv in cspec.svs:
        block, column = builder.new_chart(cspec, skip_title=True)

        stat_var_spec_map.update(
            map.map_chart_block(column=column,
                                place=cspec.places[0],
                                pri_sv=sv,
                                child_type=cspec.place_type,
                                sv2thing=sv2thing))

    elif cspec.chart_type == ChartType.RANKING_CHART:
      if not base.is_map_or_ranking_compatible(cspec):
        continue
      pri_place = cspec.places[0]

      if cv.source_topic == 'dc/topic/ProjectedClimateExtremes':
        stat_var_spec_map.update(
            ranking.ranking_chart_block_climate_extremes(
                builder, pri_place, cspec.svs, sv2thing, cspec))
      else:
        for sv in cspec.svs:
          block, column = builder.new_chart(cspec,
                                            override_sv=sv,
                                            skip_title=cv.skip_map_for_ranking)
          stat_var_spec_map.update(
              ranking.ranking_chart_block(
                  column=column,
                  pri_place=pri_place,
                  pri_sv=sv,
                  child_type=cspec.place_type,
                  sv2thing=sv2thing,
                  ranking_types=cspec.ranking_types,
                  ranking_count=cspec.ranking_count,
                  skip_map_for_ranking=cv.skip_map_for_ranking))
    elif cspec.chart_type == ChartType.SCATTER_CHART:
      _, column = builder.new_chart(cspec, skip_title=True)
      stat_var_spec_map = scatter.scatter_chart_block(
          column=column,
          pri_place=cspec.places[0],
          sv_pair=cspec.svs,
          child_type=cspec.place_type,
          sv2thing=sv2thing,
          nopc_vars=config.nopc_vars)

    elif cspec.chart_type == ChartType.EVENT_CHART and config.event_config:
      block, column = builder.new_chart(cspec, skip_title=True)
      event.event_chart_block(builder.page_config.metadata, block, column,
                              cspec.places[0], cspec.event, cspec.ranking_types,
                              config.event_config)

    elif cspec.chart_type == ChartType.RANKED_TIMELINE_COLLECTION:
      stat_var_spec_map = timeline.ranked_timeline_collection_block(
          builder, cspec, sv2thing)

    builder.update_sv_spec(stat_var_spec_map)

  builder.finalize()
  return builder.page_config
