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

import json
import os
import routes.api.place as place_api
import services.datacommons as dc_service
import lib.i18n as i18n
from google.protobuf import text_format
from config import topic_page_pb2

# This has to be in sync with static/js/shared/util.ts
PLACE_EXPLORER_CATEGORIES = [
    "economics",
    "health",
    "equity",
    "crime",
    "education",
    "demographics",
    "housing",
    "climate",
    "energy",
]

# key is topic_id, which should match the folder name under config/topic_page
# property is the list of filenames in that folder to load.
TOPIC_PAGE_CONFIGS = {
    'equity': ['USA', 'USA_states'],
    'poverty': ['USA', 'India'],
}


def get_chart_config():
    chart_config = []
    for filename in PLACE_EXPLORER_CATEGORIES:
        with open(os.path.join('config', 'chart_config', filename + '.json'),
                  encoding='utf-8') as f:
            chart_config.extend(json.load(f))
    return chart_config


# Expands the places_within field in topic.metadata with the full list of
# places, which is appended to the place_dcid list.
def _expand_topic_places_within(topic_page_config):
    metadata = topic_page_config.metadata
    for places_within in metadata.places_within:
        contained_places = dc_service.get_places_in([places_within.parent_dcid],
                                                    places_within.children_type)
        if places_within.parent_dcid in contained_places:
            metadata.place_dcid.extend(
                contained_places[places_within.parent_dcid])


# Returns topic pages loaded as TopicPageConfig protos:
# { topic_id: [TopicPageConfig,...] }
# Note: the metadata.place_dcid list in each config is expanded with all child
# places.
def get_topic_page_config():
    topic_configs = {}
    for topic_id, filenames in TOPIC_PAGE_CONFIGS.items():
        configs = []
        for filename in filenames:
            with open(
                    os.path.join('config', 'topic_page', topic_id,
                                 filename + '.textproto'), 'r') as f:
                data = f.read()
                topic_page_config = topic_page_pb2.TopicPageConfig()
                text_format.Parse(data, topic_page_config)
                _expand_topic_places_within(topic_page_config)
                configs.append(topic_page_config)
        topic_configs[topic_id] = configs
    return topic_configs


# Returns a summary of the available topic page summaries as an object:
# {
#   topicPlaceMap: {
#       <topic_id>: list of places that this config can be used for
#   },
#   topicNameMap: {
#       <topic_id>: <topic_name>
#   },
#   topicPlaceNames: {
#       <place_dcid>: <place_name>
#   }
# }
def get_topics_summary(topic_page_configs):
    topic_place_map = {}
    topic_name_map = {}
    place_ids = set()
    for topic_id, config_list in topic_page_configs.items():
        if len(config_list) < 1:
            continue
        topic_name_map[topic_id] = config_list[0].metadata.topic_name
        if topic_id not in topic_place_map:
            topic_place_map[topic_id] = []
        for config in config_list:
            topic_place_map[topic_id].extend(config.metadata.place_dcid)
            place_ids.update(config.metadata.place_dcid)
    topic_place_names = place_api.get_display_name('^'.join(place_ids),
                                                   i18n.DEFAULT_LOCALE)
    return {
        "topicPlaceMap": topic_place_map,
        "topicNameMap": topic_name_map,
        "topicPlaceNames": topic_place_names
    }
