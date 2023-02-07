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

import json
import os
from typing import Dict, List

from config import subject_page_pb2
from lib.nl import topic
from lib.nl import utils
from lib.nl.constants import PLACE_TYPE_TO_PLURALS
from lib.nl.data_spec import DataSpec
from lib.nl.detection import ClassificationType
from lib.nl.detection import Detection
from lib.nl.detection import NLClassifier
from lib.nl.detection import Place
from lib.nl.detection import RankingType
from services import datacommons as dc

CHART_TITLE_CONFIG_RELATIVE_PATH = "../../config/nl_page/chart_titles_by_sv.json"


def get_sv_name(svs):
  svs = list(set(svs))
  sv2name_raw = dc.property_values(svs, 'name')
  uncurated_names = {
      sv: names[0] if names else sv for sv, names in sv2name_raw.items()
  }
  basepath = os.path.dirname(__file__)
  title_config_path = os.path.abspath(
      os.path.join(basepath, CHART_TITLE_CONFIG_RELATIVE_PATH))
  title_by_sv_dcid = {}
  with open(title_config_path) as f:
    title_by_sv_dcid = json.load(f)
  sv_name_map = {}
  # If a curated name is found return that,
  # Else return the name property for SV.
  for sv in svs:
    if sv in title_by_sv_dcid:
      sv_name_map[sv] = title_by_sv_dcid[sv]
    else:
      sv_name_map[sv] = uncurated_names[sv]

  return sv_name_map


_SV_PARTIAL_DCID_NO_PC = [
    'Temperature', 'Precipitation', "BarometricPressure", "CloudCover",
    "PrecipitableWater", "Rainfall", "Snowfall", "Visibility", "WindSpeed",
    "ConsecutiveDryDays", "Percent", 'Area_'
]


def _should_add_percapita(sv_dcid: str) -> bool:
  for skip_phrase in _SV_PARTIAL_DCID_NO_PC:
    if skip_phrase in sv_dcid:
      return False
  return True


def _is_sv_percapita(sv_name: str) -> bool:
  # Use names for these since some old prevalence dcid's do not use the new naming scheme.
  if "Percentage" in sv_name or "Prevalence" in sv_name:
    return True
  return False


def _single_place_single_var_timeline_block(sv_dcid, sv2name):
  """A column with two charts, main stat var and per capita"""
  block = subject_page_pb2.Block(title=sv2name[sv_dcid],
                                 columns=[subject_page_pb2.Block.Column()])
  stat_var_spec_map = {}

  # Line chart for the stat var
  sv_key = sv_dcid
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                               title="Total",
                               stat_var_key=[sv_key])
  stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
      stat_var=sv_dcid, name=sv2name[sv_dcid])
  block.columns[0].tiles.append(tile)

  # Line chart for the stat var per capita
  if _should_add_percapita(sv_dcid):
    sv_key = sv_dcid + '_pc'
    tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                                 title="Per Capita",
                                 stat_var_key=[sv_key])
    stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
        stat_var=sv_dcid,
        name=sv2name[sv_dcid],
        denom="Count_Person",
        scaling=100,
        unit="%")
    block.columns[0].tiles.append(tile)
  return block, stat_var_spec_map


def _single_place_multiple_var_timeline_block(svs, sv2name):
  """A column with two chart, all stat vars and per capita"""
  block = subject_page_pb2.Block(title="Compare with Other Variables",
                                 columns=[subject_page_pb2.Block.Column()])
  stat_var_spec_map = {}

  # Line chart for the stat var
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                               title="Total",
                               stat_var_key=[])
  for sv in svs:
    sv_key = sv
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(stat_var=sv,
                                                             name=sv2name[sv])
  block.columns[0].tiles.append(tile)

  # Line chart for the stat var per capita
  svs_pc = list(filter(lambda x: _should_add_percapita(x), svs))
  if len(svs_pc) > 0:
    tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.LINE,
                                 title="Per Capita")
    for sv in svs_pc:
      sv_key = sv + '_pc'
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
          stat_var=sv,
          name=sv2name[sv],
          denom="Count_Person",
          scaling=100,
          unit="%")
    block.columns[0].tiles.append(tile)

  return block, stat_var_spec_map


def _multiple_place_bar_block(places: List[Place], svs: List[str], sv2name):
  """A column with two charts, main stat var and per capita"""
  block = subject_page_pb2.Block(title="Compare with Other Places")
  column = block.columns.add()
  stat_var_spec_map = {}
  # Total
  tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.BAR,
                               title="Total",
                               comparison_places=[x.dcid for x in places])
  for sv in svs:
    sv_key = sv + "_multiple_place_bar_block"
    tile.stat_var_key.append(sv_key)
    stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(stat_var=sv,
                                                             name=sv2name[sv])

  column.tiles.append(tile)
  # Per Capita
  svs_pc = list(filter(lambda x: _should_add_percapita(x), svs))
  if len(svs_pc) > 0:
    tile = subject_page_pb2.Tile(type=subject_page_pb2.Tile.TileType.BAR,
                                 title="Per Capita",
                                 comparison_places=[x.dcid for x in places])
    for sv in svs_pc:
      sv_key = sv + "_multiple_place_bar_block_pc"
      tile.stat_var_key.append(sv_key)
      stat_var_spec_map[sv_key] = subject_page_pb2.StatVarSpec(
          stat_var=sv,
          denom="Count_Person",
          name=sv2name[sv],
          scaling=100,
          unit="%")

    column.tiles.append(tile)
  return block, stat_var_spec_map


def _topic_sv_blocks(category: subject_page_pb2.Category,
                     classification_type: NLClassifier, topic_svs: List[str],
                     extended_sv_map: Dict[str,
                                           List[str]], sv2name, sv_exists_list):
  """Fill in category if there is a topic."""
  main_block = category.blocks.add()
  column = main_block.columns.add()
  for sv in topic_svs:
    if 'dc/svpg/' in sv:
      sub_svs = extended_sv_map[sv]
      if not sub_svs:
        continue
      sub_svs_exist = list(filter(lambda x: x in sv_exists_list, sub_svs))
      if not sub_svs_exist:
        continue
      # add a block for each peer group
      block = category.blocks.add()
      column = block.columns.add()
      for i, sub_sv in enumerate(sub_svs_exist):
        if classification_type == ClassificationType.CONTAINED_IN:
          # always maps for contained_in
          tile = column.tiles.add()
          tile.type = subject_page_pb2.Tile.TileType.MAP
          tile.title = topic.svpg_name(sv)
        else:
          # split up into several line charts
          if i % 5 == 0:
            tile = column.tiles.add()
            tile.type = subject_page_pb2.Tile.TileType.LINE
            tile.title = topic.svpg_name(sv)
        tile.stat_var_key.append(sub_sv)
        category.stat_var_spec[sub_sv].stat_var = sub_sv
        category.stat_var_spec[sub_sv].name = sv2name[sub_sv]
    elif sv in sv_exists_list:
      # add to main line chart
      tile = column.tiles.add()
      if classification_type == ClassificationType.CONTAINED_IN:
        # always maps for contained_in
        tile.type = subject_page_pb2.Tile.TileType.MAP
      else:
        tile.type = subject_page_pb2.Tile.TileType.LINE
      tile.title = sv2name[sv]
      tile.stat_var_key.append(sv)
      category.stat_var_spec[sv].stat_var = sv
      category.stat_var_spec[sv].name = sv2name[sv]


def build_page_config(detection: Detection, data_spec: DataSpec,
                      context_history):

  main_place_spec = data_spec.main_place_spec
  contained_place_spec = data_spec.contained_place_spec

  # Init
  page_config = subject_page_pb2.SubjectPageConfig()
  # Set metadata
  page_config.metadata.place_dcid.append(main_place_spec.place)
  page_config.metadata.contained_place_types[
      main_place_spec.type] = contained_place_spec.contained_place_type

  # Set category data
  category = page_config.categories.add()
  classifier = detection.classifications[0]
  classificationType = classifier.type

  selected_svs = data_spec.selected_svs
  extended_sv_map = data_spec.extended_sv_map
  use_context_sv = False

  # No stat vars found
  context_place = None
  if not selected_svs:
    for context in reversed(context_history):
      if context and context['debug'] and context['debug'][
          'data_spec'] and context['debug']['data_spec']['selected_svs']:
        selected_svs = context['debug']['data_spec']['selected_svs']
        extended_sv_map = context['debug']['data_spec']['extended_sv_map']
        use_context_sv = True
        context_place = Place(dcid=context['place_dcid'],
                              name=context['place_name'],
                              place_type=context['place_type'])
        break

  if data_spec.topic_svs and data_spec.main_place_spec.place:
    # Special boost for topics
    all_svs = data_spec.topic_svs.copy()
    for _, v in topic.get_topic_peers(data_spec.topic_svs).items():
      all_svs += v
    sv2name = get_sv_name(all_svs)
    _topic_sv_blocks(category, classificationType, data_spec.topic_svs,
                     data_spec.extended_sv_map, sv2name,
                     data_spec.main_place_spec.svs)
    return page_config

  if not selected_svs:
    if main_place_spec.place:
      block = category.blocks.add()
      block.title = main_place_spec.name
      column = block.columns.add()
      tile = column.tiles.add()
      tile.type = subject_page_pb2.Tile.TileType.PLACE_OVERVIEW
    return page_config

  all_svs = selected_svs
  for _, v in data_spec.extended_sv_map.items():
    all_svs += v
  sv2name = get_sv_name(all_svs)

  #  ONLY ONE sv from selected_svs is used
  primary_sv = selected_svs[0]
  extended_svs = extended_sv_map[primary_sv]

  if classificationType in [
      ClassificationType.SIMPLE, ClassificationType.OTHER
  ]:
    if use_context_sv:
      # Only place is asked, draw comparison between two places
      block, stat_var_spec_map = _multiple_place_bar_block(
          [context_place, detection.places_detected.main_place], [primary_sv],
          sv2name)
      category.blocks.append(block)
      for sv_key, spec in stat_var_spec_map.items():
        category.stat_var_spec[sv_key].CopyFrom(spec)
      # Draw for all stat vars
      if extended_svs:
        block, stat_var_spec_map = _multiple_place_bar_block(
            [context_place, detection.places_detected.main_place], extended_svs,
            sv2name)
        category.blocks.append(block)
        for sv_key, spec in stat_var_spec_map.items():
          category.stat_var_spec[sv_key].CopyFrom(spec)
    else:
      # Query for place and sv, draw simple charts
      # The primary stat var
      block, stat_var_spec_map = _single_place_single_var_timeline_block(
          primary_sv, sv2name)
      category.blocks.append(block)
      for sv_key, spec in stat_var_spec_map.items():
        category.stat_var_spec[sv_key].CopyFrom(spec)

      # The siblings for the primary stat var
      if extended_svs:
        block, stat_var_spec_map = _single_place_multiple_var_timeline_block(
            extended_svs, sv2name)
        category.blocks.append(block)
        for sv_key, spec in stat_var_spec_map.items():
          category.stat_var_spec[sv_key].CopyFrom(spec)

  elif classificationType in [
      ClassificationType.RANKING, ClassificationType.CONTAINED_IN
  ]:
    if primary_sv in contained_place_spec.svs:
      block = category.blocks.add()
      block.title = "{} in {}".format(
          utils.pluralize_place_type(
              contained_place_spec.contained_place_type).capitalize(),
          main_place_spec.name)
      column = block.columns.add()
      # The main tile
      tile = column.tiles.add()
      tile.stat_var_key.append(primary_sv)
      if classifier.type == ClassificationType.RANKING:
        tile.type = subject_page_pb2.Tile.TileType.RANKING
        tile.ranking_tile_spec.ranking_count = 10
        if "CriminalActivities" in primary_sv:
          # first check if "best" or "worst"
          if RankingType.BEST in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_lowest = True
          elif RankingType.WORST in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_highest = True
          else:
            # otherwise, render normally
            if RankingType.HIGH in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_highest = True
            if RankingType.LOW in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_lowest = True
        else:
          if RankingType.HIGH in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_highest = True
          if RankingType.LOW in classifier.attributes.ranking_type:
            tile.ranking_tile_spec.show_lowest = True

        tile.title = ''.join(
            [sv2name[primary_sv], ' in ', main_place_spec.name])
      else:
        tile.type = subject_page_pb2.Tile.TileType.MAP
        tile.title = sv2name[primary_sv] + ' (${date})'
      category.stat_var_spec[primary_sv].stat_var = primary_sv
      category.stat_var_spec[primary_sv].name = sv2name[primary_sv]

      # The per capita tile
      if _should_add_percapita(primary_sv):
        tile = column.tiles.add()
        sv_key = primary_sv + "_pc"
        tile.stat_var_key.append(sv_key)
        if classifier.type == ClassificationType.RANKING:
          tile.type = subject_page_pb2.Tile.TileType.RANKING
          tile.ranking_tile_spec.ranking_count = 10
          if "CriminalActivities" in primary_sv:
            # first check if "best" or "worst"
            if RankingType.BEST in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_lowest = True
            elif RankingType.WORST in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_highest = True
            else:
              # otherwise, render normally
              if RankingType.HIGH in classifier.attributes.ranking_type:
                tile.ranking_tile_spec.show_highest = True
              if RankingType.LOW in classifier.attributes.ranking_type:
                tile.ranking_tile_spec.show_lowest = True
          else:
            if RankingType.HIGH in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_highest = True
            if RankingType.LOW in classifier.attributes.ranking_type:
              tile.ranking_tile_spec.show_lowest = True

          tile.title = ''.join([
              'Per Capita ', sv2name[primary_sv], ' in ', main_place_spec.name
          ])
        else:
          tile.type = subject_page_pb2.Tile.TileType.MAP
          tile.title = "Per Capita " + sv2name[primary_sv] + ' (${date})'
        category.stat_var_spec[sv_key].stat_var = primary_sv
        category.stat_var_spec[sv_key].name = sv2name[primary_sv]
        category.stat_var_spec[sv_key].denom = "Count_Person"
        category.stat_var_spec[sv_key].unit = "%"
        category.stat_var_spec[sv_key].scaling = 100

  # Render scatter plot if query asks for a correlation
  # IMPORTANT: assumes that data_spec.selected_svs is not empty
  # This might be fragile
  # TODO: add check for data_spec.selected_svs
  elif classificationType == ClassificationType.CORRELATION:

    # get first stat var from current data spec
    sv_1 = data_spec.selected_svs[0]

    # get second stat var from previous context
    # search up context history for latest selected_svs
    sv_2 = None
    for context in reversed(context_history):
      if context['debug'].get('data_spec', {}).get('selected_svs'):
        sv_2 = context['debug']['data_spec']['selected_svs'][0]
        break
    if not sv_2:
      # if can't be found in context, see if there is a second selected sv
      if len(data_spec.selected_svs) > 1:
        sv_2 = data_spec.selected_svs[1]
      else:
        sv_2 = sv_1  # self-correlation as fail state.

    #get names
    sv_names = get_sv_name([sv_1, sv_2])
    sv_1_name = sv_names[sv_1]
    sv_2_name = sv_names[sv_2]

    # if the word "Percent" is in one, check that the other is similarly normalized
    # use names since we sometimes get old hex dcid's
    change_sv_1_pc = False
    change_sv_2_pc = False
    if _is_sv_percapita(sv_1_name):
      if not _is_sv_percapita(sv_2_name):
        change_sv_2_pc = True
        sv_2_name += " Per Capita"
    if _is_sv_percapita(sv_2_name):
      if not _is_sv_percapita(sv_1_name):
        change_sv_1_pc = True
        sv_1_name += " Per Capita"

    # set keys and specs of each stat var
    sv_1_key = sv_1 + "_scatter"
    category.stat_var_spec[sv_1_key].stat_var = sv_1
    category.stat_var_spec[sv_1_key].name = sv_1_name
    if change_sv_1_pc:
      category.stat_var_spec[sv_1_key].denom = "Count_Person"
      category.stat_var_spec[sv_1_key].unit = "%"
      category.stat_var_spec[sv_1_key].scaling = 100

    sv_2_key = sv_2 + "_scatter"
    category.stat_var_spec[sv_2_key].stat_var = sv_2
    category.stat_var_spec[sv_2_key].name = sv_2_name
    if change_sv_2_pc:
      category.stat_var_spec[sv_2_key].denom = "Count_Person"
      category.stat_var_spec[sv_2_key].unit = "%"
      category.stat_var_spec[sv_2_key].scaling = 100

    # add a scatter config
    block = category.blocks.add()
    column = block.columns.add()
    tile = column.tiles.add()
    tile.stat_var_key.append(sv_1_key)
    tile.stat_var_key.append(sv_2_key)
    tile.type = subject_page_pb2.Tile.TileType.SCATTER
    tile.title = f"{sv_1_name} vs. {sv_2_name}"

  # # Contained place
  return page_config
