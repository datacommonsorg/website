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
import time
from typing import cast, List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.nl.common import utils
from server.lib.nl.common import variable
from server.lib.nl.common.constants import PROJECTED_TEMP_TOPIC
from server.lib.nl.common.utterance import ChartType
from server.lib.nl.config_builder import answer
from server.lib.nl.config_builder import bar
from server.lib.nl.config_builder import base
from server.lib.nl.config_builder import event
from server.lib.nl.config_builder import highlight
from server.lib.nl.config_builder import map
from server.lib.nl.config_builder import ranking
from server.lib.nl.config_builder import scatter
from server.lib.nl.config_builder import timeline
from server.lib.nl.config_builder.base import Config
from server.lib.nl.explore.params import DCNames
from server.lib.nl.explore.params import is_special_dc
from server.lib.nl.explore.params import Params
from server.lib.nl.fulfillment.types import ChartSpec
from server.lib.nl.fulfillment.types import ChartVars
from server.lib.nl.fulfillment.types import PopulateState
from server.lib.nl.fulfillment.types import SV2Thing


@dataclass
class BuilderResult:
  page_config: SubjectPageConfig = None
  page_msg: str = ''


# Given a list of charts, get the page level message to show for these charts.
# If all charts have the same message, will return that message. Otherwise,
# return an empty message.
def _get_page_level_msg(charts: List[ChartSpec]) -> str:
  msg = ''
  for idx, cspec in enumerate(charts):
    cspec = cast(ChartSpec, cspec)
    if idx == 0:
      msg = cspec.info_message
    elif cspec.info_message != msg:
      msg = ''
      break
  return msg


#
# Given an Utterance, build the final Chart config proto.
# Returns the chart config proto and user message (empty if no message to show).
#
def build(state: PopulateState, config: Config) -> BuilderResult:
  if not state.uttr.rankedCharts:
    return BuilderResult()

  dc = state.uttr.insight_ctx.get(Params.DC.value, DCNames.MAIN_DC.value)
  # Get names of all SVs
  uttr = state.uttr
  all_svs = set()
  for cspec in uttr.rankedCharts:
    all_svs.update(cspec.svs)
    cv: ChartVars = cspec.chart_vars
    if cv.source_topic:
      all_svs.add(cv.source_topic)
    if cv.svpg_id:
      all_svs.add(cv.svpg_id)
    if cv.orig_sv_map:
      all_svs.update(cv.orig_sv_map.keys())
  all_svs = list(all_svs)
  start = time.time()
  sv2thing = SV2Thing(
      name=variable.get_sv_name(all_svs, config.sv_chart_titles, dc),
      unit=variable.get_sv_unit(all_svs),
      description=variable.get_sv_description(all_svs),
      footnote=variable.get_sv_footnote(all_svs),
  )
  state.sv2thing = sv2thing
  # In SDG mode, override the place names with `unDataLabel` values.
  if is_special_dc(state.uttr.insight_ctx):
    _set_un_labels_in_places(state)
  uttr.counters.timeit('get_sv_details', start)

  builder = base.Builder(uttr, sv2thing, config)
  user_message = _get_page_level_msg(uttr.rankedCharts)

  # Build chart blocks
  for cspec in uttr.rankedCharts:
    cspec = cast(ChartSpec, cspec)
    cv = cspec.chart_vars
    # if there is a user message, that means every chart spec had the same info
    # message and we should show the message at the page level instead of block
    # level.
    if user_message:
      cspec.info_message = ''

    if cspec.chart_type == ChartType.ANSWER:
      if len(cspec.props) > 1 or len(cspec.entities) > 1:
        answer.answer_table_block(builder, cspec)
      else:
        answer.answer_message_block(builder, cspec)

    if cspec.chart_type == ChartType.ENTITY_OVERVIEW:
      block = builder.new_chart(cspec, skip_title=True)
      base.entity_overview_block(block.columns.add(), cspec.entities[0])

    if not cspec.places:
      continue
    stat_var_spec_map = {}

    # Call per-chart handlers.
    if cspec.chart_type == ChartType.PLACE_OVERVIEW:
      # Skip the title because in explore the place appears
      # as page title.
      block = builder.new_chart(cspec, skip_title=True)
      base.place_overview_block(block.columns.add())

    elif cspec.chart_type == ChartType.TIMELINE_WITH_HIGHLIGHT:
      if len(cspec.svs) > 1:
        block = builder.new_chart(cspec)
        stat_var_spec_map = timeline.single_place_multiple_var_timeline_block(
            column=block.columns.add(),
            place=cspec.places[0],
            svs=cspec.svs,
            sv2thing=sv2thing,
            cv=cv,
            single_date=cspec.single_date,
            date_range=cspec.date_range,
            sv_place_facet=cspec.sv_place_facet)
      elif len(cspec.places) > 1:
        stat_var_spec_map = timeline.multi_place_single_var_timeline_block(
            builder=builder,
            places=cspec.places,
            sv=cspec.svs[0],
            sv2thing=sv2thing,
            cspec=cspec)
      else:
        block = builder.new_chart(cspec)
        if cspec.is_special_dc:
          # Return highlight before timeline for SDG.
          stat_var_spec_map.update(
              highlight.highlight_block(block.columns.add(), cspec.places[0],
                                        cspec.svs[0], sv2thing,
                                        cspec.single_date, cspec.date_range,
                                        cspec.sv_place_latest_date))
        stat_var_spec_map = timeline.single_place_single_var_timeline_block(
            column=block.columns.add(),
            place=cspec.places[0],
            sv_dcid=cspec.svs[0],
            sv2thing=sv2thing,
            single_date=cspec.single_date,
            date_range=cspec.date_range,
            sv_place_facet=cspec.sv_place_facet)
        if not cspec.is_special_dc:
          stat_var_spec_map.update(
              highlight.highlight_block(block.columns.add(), cspec.places[0],
                                        cspec.svs[0], sv2thing,
                                        cspec.single_date, cspec.date_range,
                                        cspec.sv_place_latest_date))

    elif cspec.chart_type == ChartType.BAR_CHART:
      block = builder.new_chart(cspec)
      if len(cspec.places) == 1 and len(cspec.svs) == 1:
        # Demote this to a highlight.
        stat_var_spec_map = highlight.highlight_block(
            block.columns.add(), cspec.places[0], cspec.svs[0], sv2thing,
            cspec.single_date, cspec.date_range, cspec.sv_place_latest_date)
      else:
        stat_var_spec_map = bar.multiple_place_bar_block(
            column=block.columns.add(),
            places=cspec.places,
            svs=cspec.svs,
            sv2thing=sv2thing,
            cv=cv,
            single_date=cspec.single_date,
            date_range=cspec.date_range,
            sv_place_latest_date=cspec.sv_place_latest_date,
            sort_order=bar.get_sort_order(state, cspec))

    elif cspec.chart_type == ChartType.MAP_CHART:
      if not base.is_map_or_ranking_compatible(cspec):
        state.uttr.counters.err('chart_builder_map_incompatible', 1)
        continue
      block = builder.new_chart(cspec,
                                place=cspec.places[0],
                                child_type=cspec.place_type)
      for sv in cspec.svs:
        stat_var_spec_map.update(
            map.map_chart_block(
                column=block.columns.add(),
                place=cspec.places[0],
                pri_sv=sv,
                child_type=cspec.place_type,
                sv2thing=sv2thing,
                single_date=cspec.single_date,
                date_range=cspec.date_range,
                sv_place_latest_date=cspec.sv_place_latest_date))

    elif cspec.chart_type == ChartType.RANKING_WITH_MAP:
      if not base.is_map_or_ranking_compatible(cspec):
        state.uttr.counters.err('chart_builder_ranking_incompatible', 1)
        continue
      pri_place = cspec.places[0]

      if cv.source_topic == PROJECTED_TEMP_TOPIC:
        stat_var_spec_map.update(
            ranking.ranking_chart_block_climate_extremes(
                builder, pri_place, cspec.svs, sv2thing, cspec))
      else:
        if cv.skip_map_for_ranking:
          # Create the block here.
          block = builder.new_chart(cspec,
                                    place=pri_place,
                                    child_type=cspec.place_type)
        for sv in cspec.svs:
          if not cv.skip_map_for_ranking:
            # We have a rank + map, so create a block per SV.
            block = builder.new_chart(cspec,
                                      override_sv=sv,
                                      place=pri_place,
                                      child_type=cspec.place_type)
            if len(cspec.ranking_types) > 1:
              # This is Explore case where we show both HIGH + LOW mappings.
              stat_var_spec_map.update(
                  map.map_chart_block(
                      column=block.columns.add(),
                      place=pri_place,
                      pri_sv=sv,
                      child_type=cspec.place_type,
                      sv2thing=sv2thing,
                      single_date=cspec.single_date,
                      date_range=cspec.date_range,
                      sv_place_latest_date=cspec.sv_place_latest_date))
          stat_var_spec_map.update(
              ranking.ranking_chart_block(
                  column=block.columns.add(),
                  pri_place=pri_place,
                  pri_sv=sv,
                  child_type=cspec.place_type,
                  sv2thing=sv2thing,
                  ranking_types=cspec.ranking_types,
                  ranking_count=cspec.ranking_count,
                  single_date=cspec.single_date,
                  date_range=cspec.date_range,
                  sv_place_latest_date=cspec.sv_place_latest_date))
          if not cv.skip_map_for_ranking and len(cspec.ranking_types) < 2:
            # Also add a map chart.
            stat_var_spec_map.update(
                map.map_chart_block(
                    column=block.columns.add(),
                    place=pri_place,
                    pri_sv=sv,
                    child_type=cspec.place_type,
                    sv2thing=sv2thing,
                    single_date=cspec.single_date,
                    date_range=cspec.date_range,
                    sv_place_latest_date=cspec.sv_place_latest_date))

    elif cspec.chart_type == ChartType.SCATTER_CHART:
      stat_var_spec_map = scatter.scatter_chart_block(builder, cspec)

    elif cspec.chart_type == ChartType.EVENT_CHART and config.event_config:
      block = builder.new_chart(cspec, skip_title=True)
      event.event_chart_block(builder.page_config.metadata, block,
                              cspec.places[0], cspec.event, cspec.ranking_types,
                              config.event_config)

    elif cspec.chart_type == ChartType.RANKED_TIMELINE_COLLECTION:
      stat_var_spec_map = timeline.ranked_timeline_collection_block(
          builder, cspec, sv2thing, cspec.single_date, cspec.date_range)

    builder.update_sv_spec(stat_var_spec_map)

  builder.finalize()
  return BuilderResult(page_config=builder.page_config, page_msg=user_message)


def _set_un_labels_in_places(state: PopulateState):
  # Collect all the DCIDs.
  place_dcids = set()
  for cspec in state.uttr.rankedCharts:
    place_dcids.update([p.dcid for p in cspec.places])
  for ps in [state.uttr.places, state.uttr.answerPlaces]:
    place_dcids.update([p.dcid for p in ps])
  if state.uttr.place_fallback and state.uttr.place_fallback.newPlace:
    place_dcids.add(state.uttr.place_fallback.newPlace.dcid)

  # Fetch UN Labels.
  place2labels = utils.get_un_labels(list(place_dcids))

  # Set all the names.
  for cspec in state.uttr.rankedCharts:
    for p in cspec.places:
      p.name = place2labels.get(p.dcid, p.name)
  for ps in [state.uttr.places, state.uttr.answerPlaces]:
    for p in ps:
      p.name = place2labels.get(p.dcid, p.name)
  if state.uttr.place_fallback and state.uttr.place_fallback.newPlace:
    state.uttr.place_fallback.newPlace.name = place2labels.get(
        state.uttr.place_fallback.newPlace.dcid,
        state.uttr.place_fallback.newPlace.name)
