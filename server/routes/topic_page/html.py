# Copyright 2021 Google LLC
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
"""Topic page related handlers."""

import json

import flask
from flask import current_app
from flask import g
from flask import request
from google.protobuf.json_format import MessageToJson

import server.lib.subject_page_config as lib_subject_page_config
import server.lib.util as libutil
import server.routes.shared_api.place as place_api
import server.services.datacommons as dc
import logging

# TechSoup - add search bar and child places
_TOPICS_TO_DISPLAY_SEARCH_BAR = ["dc2_4", "climate_allvars"]
_TOPICS_TO_SHOW_CHILD_PLACES = ["dc2_4", "climate_allvars"]

_NL_DISASTER_TOPIC = 'nl_disasters'
_SDG_TOPIC = 'sdg'
_DEBUG_TOPICS = ['dev', _SDG_TOPIC, _NL_DISASTER_TOPIC]
_SDG_COMPARISON_PLACES = [
    'country/USA', 'country/CHN', 'country/JPN', 'country/IND'
]
# Max number of places; Choose 6 to match the bar_tile bar limits.
_MAX_NUM_PLACES = 6

bp = flask.Blueprint('topic_page', __name__, url_prefix='/topic')


def get_sdg_config(place_dcid, more_places, topic_config):
  topic_place_config = topic_config
  topic_place_config.metadata.place_dcid.append(place_dcid)
  # Populuate comparison places (fixed places) for all tiles
  comparison_places = [place_dcid]
  if more_places:
    comparison_places.extend(more_places)
  for p in _SDG_COMPARISON_PLACES:
    if len(comparison_places) >= _MAX_NUM_PLACES:
      break
    if p not in comparison_places:
      comparison_places.append(p)
  for category in topic_place_config.categories:
    for block in category.blocks:
      for column in block.columns:
        for tile in column.tiles:
          tile.comparison_places.extend(comparison_places)
  topic_place_config = lib_subject_page_config.remove_empty_charts(
      topic_place_config, place_dcid, '')
  return topic_place_config


@bp.route('', strict_slashes=False)
@bp.route('/<string:topic_id>', strict_slashes=False)
@bp.route('/<string:topic_id>/<path:place_dcid>', strict_slashes=False)
def topic_page(topic_id=None, place_dcid=None):
  topics_summary = json.dumps(current_app.config['TOPIC_PAGE_SUMMARY'])
  # Redirect to the landing page.
  if not place_dcid and not topic_id:
    return flask.render_template('topic_page_landing.html')

  all_configs = current_app.config['TOPIC_PAGE_CONFIG']
  if g.env == 'local':
    all_configs = libutil.get_topic_page_config()

  # TO DO: For TECHSOUP dev only, remove this before deploying
  if g.env == 'custom':
    all_configs = libutil.get_topic_page_config()

  topic_configs = all_configs.get(topic_id, [])

  if topic_id in _DEBUG_TOPICS:
    if current_app.config['SHOW_TOPIC']:
      if topic_id == _NL_DISASTER_TOPIC:
        topic_configs = [libutil.get_nl_disaster_config()]
    else:
      flask.abort(404)

  if len(topic_configs) < 1:
    return "Error: no config found"

  if not place_dcid:
    return flask.render_template(
        'topic_page.html',
        place_type="",
        place_name="",
        place_dcid="",
        topic_id=topic_id,
        topic_name=topic_configs[0].metadata.topic_name or "",
        config={},
        topics_summary=topics_summary)

  more_places = request.args.getlist('places')

  place_name = ''
  place_type = ''
  parent_dcids = set()
  place_info = dc.get_place_info([place_dcid])
  for item in place_info.get('data', []):
    if 'node' not in item or item['node'] != place_dcid or 'info' not in item:
      continue
    place_name = item['info'].get('self', {}).get('name', '')
    place_type = item['info'].get('self', {}).get('type', '')
    for parent in item['info'].get('parents', []):
      parent_dcids.add(parent.get('dcid'))

  # Find the config for the topic & place.
  topic_place_config = None
  if topic_id == _SDG_TOPIC:
    topic_place_config = get_sdg_config(place_dcid, more_places,
                                        topic_configs[0])
  else:
    for config in topic_configs:
      if place_dcid in config.metadata.place_dcid:
        topic_place_config = config
        break
      for place_group in config.metadata.place_group:
        if place_group.parent_place in parent_dcids and place_group.place_type == place_type:
          topic_place_config = config
          break
    if not topic_place_config:
      return "Error: no config found"
    contained_place_type = topic_place_config.metadata.contained_place_types.get(
        place_type, None)
    topic_place_config = lib_subject_page_config.remove_empty_charts(
        topic_place_config, place_dcid, contained_place_type)

  place_names = place_api.get_i18n_name([place_dcid])
  if place_names:
    place_name = place_names[place_dcid]
  else:
    place_name = place_dcid

  # [TECHSOUP] call place_metadata function to get child places. TO DO: refactor to avoid redundant info returned by place_metadata 
  if topic_id in _TOPICS_TO_SHOW_CHILD_PLACES:
    show_child_places = True
    place_metadata = lib_subject_page_config.place_metadata(place_dcid, True, None, None, 'name', False)
    place_children = place_metadata.child_places
  else:
    show_child_places = False
    place_children = []

  if topic_id in _TOPICS_TO_DISPLAY_SEARCH_BAR:
    display_searchbar = True
  else:
    display_searchbar = False

  return flask.render_template(
      'topic_page.html',
      place_type=place_type,
      place_name=place_name,
      place_dcid=place_dcid,
      more_places=json.dumps(more_places),
      topic_id=topic_id,
      topic_name=topic_place_config.metadata.topic_name or "",
      page_config=MessageToJson(topic_place_config),
      topics_summary=topics_summary,
      show_child_places=json.dumps(show_child_places),
      place_children=json.dumps(place_children),
      display_searchbar=json.dumps(display_searchbar),
      maps_api_key=current_app.config['MAPS_API_KEY'])
