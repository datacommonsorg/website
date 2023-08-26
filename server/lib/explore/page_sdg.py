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
from typing import Dict, List

from server.config.subject_page_pb2 import SubjectPageConfig
from server.lib.explore import params
from server.lib.explore.page_type import default_sdg
from server.lib.explore.page_type import fallback
from server.lib.explore.page_type import place_comparison
from server.lib.explore.page_type import var_correlation
from server.lib.explore.page_type.builder import Builder
from server.lib.explore.page_type.builder import ConfigResp
from server.lib.nl.common import topic
from server.lib.nl.common import utils
from server.lib.nl.common import variable
from server.lib.nl.config_builder import base
import server.lib.nl.fulfillment.types as ftypes


# This class identifies the hierarchy of topics under which
# the main topic falls.
#
# If category/block is empty, then the sub-topics of the
# main topic will be filled up.  Otherwise, the sub-topics
# will not appear in the title.
@dataclass
class TopicTree:
  # Topic for page-level title
  page: Dict = None
  # Topic for category-level title
  category: Dict = None
  # Topic for block-level title.
  block: Dict = None


def build_config(chart_vars_list: List[ftypes.ChartVars],
                 state: ftypes.PopulateState, all_svs: List[str],
                 env_config: base.Config) -> ConfigResp:
  # Get names of all SVs
  dc = state.uttr.insight_ctx[params.Params.DC.value]
  start = time.time()
  sv2thing = ftypes.SV2Thing(
      name=variable.get_sv_name(all_svs, env_config.sv_chart_titles, dc),
      unit=variable.get_sv_unit(all_svs),
      description=variable.get_sv_description(all_svs),
      footnote=variable.get_sv_footnote(all_svs),
  )
  state.uttr.counters.timeit('get_sv_details', start)

  # Decide on the levels of the hierarchy!
  topic_tree = _get_topic_tree(chart_vars_list, sv2thing, dc)

  builder = Builder(state, env_config, sv2thing, len(chart_vars_list))

  if topic_tree.page:
    builder.page_config.metadata.topic_id = topic_tree.page['dcid']
    builder.page_config.metadata.topic_name = topic_tree.page['name']

  if topic_tree.category:
    builder.new_category(topic_tree.category['name'],
                         topic_tree.category['dcid'])

  if topic_tree.block:
    builder.new_block(topic_tree.block['name'])

  prev_topic = None
  for i, chart_vars in enumerate(chart_vars_list):
    # The chart_vars will be ordered, so add a new category for
    # every distinct source-topic.
    if i == 0 or prev_topic != chart_vars.source_topic:
      title = ''
      dcid = ''
      if chart_vars.source_topic:
        title = sv2thing.name.get(chart_vars.source_topic, '')
        dcid = chart_vars.source_topic
      if not topic_tree.category:
        if topic_tree.page and topic_tree.page[
            'dcid'] == chart_vars.source_topic:
          builder.new_category('', '')
        else:
          # There was no category, make sub-topic a category.
          builder.new_category(title, dcid)
        builder.new_block('')
      elif not topic_tree.block:
        # There was a category, but no block, so make sub-topic a block.
        builder.new_block(title)
      prev_topic = chart_vars.source_topic
    _add_charts(chart_vars, state, builder)

  builder.cleanup_config()

  # If after cleanup, the config is empty, maybe fallback.
  fallback.maybe_fallback(state, builder)

  return ConfigResp(builder.page_config,
                    plotted_orig_vars=builder.plotted_orig_vars)


def _add_charts(chart_vars: ftypes.ChartVars, state: ftypes.PopulateState,
                builder: Builder) -> Dict:
  sv_spec = {}

  if builder.is_var_comparison:
    sv_spec.update(var_correlation.add_chart(chart_vars, state, builder))
    builder.update_sv_spec(sv_spec)
    return

  if not chart_vars.is_topic_peer_group:
    for sv in chart_vars.svs:
      if builder.is_place_comparison:
        sv_spec.update(place_comparison.add_sv(sv, chart_vars, state, builder))
      else:
        sv_spec.update(default_sdg.add_sv(sv, chart_vars, state, builder))
  else:
    if builder.is_place_comparison:
      sv_spec.update(place_comparison.add_svpg(chart_vars, state, builder))
    else:
      sv_spec.update(default_sdg.add_svpg(chart_vars, state, builder))

  builder.update_sv_spec(sv_spec)


def _get_topic_tree(chart_vars_list: List[ftypes.ChartVars],
                    sv2thing: ftypes.SV2Thing, dc: str) -> TopicTree:
  tree = TopicTree()
  ancestors = []
  topics = set(
      [cv.orig_sv for cv in chart_vars_list if utils.is_topic(cv.orig_sv)])
  if len(topics) != 1:
    return tree

  main_id = list(topics)[0]
  main_topic = {
      'dcid': main_id,
      'name': sv2thing.name.get(main_id),
      'types': ['Topic']
  }
  ancestors = topic.get_ancestors(main_id, dc)

  if len(ancestors) < 2:
    # main_topic => SDG root or GOAL-x
    tree.page = main_topic
  elif len(ancestors) == 2:
    # main_topic => TARGET-x
    # ancestors => [GOAL-x, ROOT]
    tree.page = ancestors[0]
    tree.category = main_topic
  elif len(ancestors) == 3:
    # main_topic => INDICATOR
    # ancestors => [TARGET-x, GOAL-y, ROOT]
    tree.page = ancestors[1]
    tree.category = ancestors[0]
    tree.block = main_topic
  else:
    # main_topic => sub-indicator topic.
    # ancestors => [..., INDICATOR-x, TARGET-y, GOAL-z, ROOT]
    tree.page = ancestors[-2]
    tree.category = ancestors[-3]
    tree.block = ancestors[-4]
  return tree
