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

import csv
from datetime import datetime
import gzip
import hashlib
import json
import logging
import os
import time
from typing import List
import urllib

from flask import make_response
from google.protobuf import text_format

from server.config import subject_page_pb2

_ready_check_timeout = 120  # seconds
_ready_check_sleep_seconds = 5

# This has to be in sync with static/js/shared/util.ts
PLACE_EXPLORER_CATEGORIES = [
    "economics",
    "health",
    "equity",
    "crime",
    "education",
    "demographics",
    "housing",
    "environment",
    "energy",
]

# key is topic_id, which should match the folder name under config/topic_page
# property is the list of filenames in that folder to load.
TOPIC_PAGE_CONFIGS = {
    'equity': ['USA', 'US_Places'],
    'poverty': ['USA', 'India'],
    'dev': ['CA'],
    'sdg': ['sdg'],
    'foodsecurity' : ['USA', 'CA'],
    'dc2_1' : ['COL'],
    'dc2_2' : ['NGA']
}

# Levels range from 0 (fastest, least compression), to 9 (slowest, most
# compression).
GZIP_COMPRESSION_LEVEL = 3

# Dict of place dcid to place type to filename of the geojson to cache for that
# place + place type combination.
# To generate cached geojson files, follow instructions/use the endpoint here:
# https://github.com/chejennifer/website/blob/generateCacheGeojsons/server/routes/api/choropleth.py#L201-L273
CACHED_GEOJSON_FILES = {
    "Earth": {
        "Country": "earth_country_dp13"
    },
    "africa": {
        "Country": "africa_country_dp10"
    },
    "asia": {
        "Country": "asia_country_dp10"
    },
    "europe": {
        "Country": "europe_country_dp6"
    },
    "northamerica": {
        "Country": "northamerica_country_dp13"
    },
    "oceania": {
        "Country": "oceania_country_dp13"
    },
    "southamerica": {
        "Country": "southamerica_country_dp10"
    },
    "geoId/06": {
        "CensusTract": "california_censustract"
    },
    "geoId/12": {
        "CensusTract": "florida_censustract"
    },
    "geoId/36": {
        "CensusTract": "newyorkstate_censustract"
    },
    "geoId/48": {
        "CensusTract": "texas_censustract"
    },
}


def get_repo_root():
  '''Get the absolute path of the repo root directory
  '''
  return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_chart_config():
  chart_config = []
  for filename in PLACE_EXPLORER_CATEGORIES:
    with open(os.path.join(get_repo_root(), 'config', 'chart_config',
                           filename + '.json'),
              encoding='utf-8') as f:
      chart_config.extend(json.load(f))
  return chart_config


# Get the SubjectPageConfig of the textproto at the given filepath
def get_subject_page_config(filepath):
  with open(filepath, 'r') as f:
    data = f.read()
    subject_page_config = subject_page_pb2.SubjectPageConfig()
    text_format.Parse(data, subject_page_config)
    return subject_page_config


# Returns topic pages loaded as SubjectPageConfig protos:
# { topic_id: [SubjectPageConfig,...] }
def get_topic_page_config():
  topic_configs = {}
  for topic_id, filenames in TOPIC_PAGE_CONFIGS.items():
    configs = []
    for filename in filenames:
      filepath = os.path.join(get_repo_root(), 'config', 'topic_page', topic_id,
                              filename + '.textproto')
      configs.append(get_subject_page_config(filepath))
    topic_configs[topic_id] = configs
  return topic_configs


# Returns disaster dashboard config loaded as SubjectPageConfig protos
def get_disaster_dashboard_config():
  filepath = os.path.join(get_repo_root(), "config", "subject_page",
                          "dashboard.textproto")
  disaster_event_metadata = get_disaster_event_metadata()
  config = get_subject_page_config(filepath)
  config.metadata.MergeFrom(disaster_event_metadata)
  return config


# Returns disaster event config loaded as SubjectPageConfig protos
def get_disaster_event_config():
  filepath = os.path.join(get_repo_root(), "config", "subject_page",
                          "events.textproto")
  return get_subject_page_config(filepath)


# Returns LLM prompt text
def get_llm_prompt_text():
  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "palm_prompt.txt")
  with open(filepath, 'r') as f:
    data = f.read()
  return data


# Returns disaster sustainability config loaded as SubjectPageConfig protos
def get_disaster_sustainability_config():
  filepath = os.path.join(get_repo_root(), "config", "subject_page",
                          "sustainability.textproto")
  disaster_event_metadata = get_disaster_event_metadata()
  config = get_subject_page_config(filepath)
  config.metadata.MergeFrom(disaster_event_metadata)
  return config


# Returns disaster dashboard config for NL
def get_nl_disaster_config():
  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "disasters.textproto")
  return get_subject_page_config(filepath)


# Returns chart titles for NL
def get_nl_chart_titles():
  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "chart_titles_by_sv.json")
  with open(filepath, 'r') as f:
    return json.load(f)


# Returns a set of SVs that should not have Per-capita.
# TODO: Eventually read this from KG.
def get_nl_no_percapita_vars():
  # NOTE: This is a checked-in version of https://shorturl.at/afpMY
  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "nl_vars_percapita_ranking.csv")
  nopc_vars = set()
  with open(filepath, 'r') as f:
    for row in csv.DictReader(f):
      sv = row['DCID'].strip()
      yn = row['isPerCapitaValid'].strip().lower()
      if sv and yn in ['n', 'no']:
        nopc_vars.add(sv)
    return nopc_vars


# Returns common event_type_spec for all disaster event related pages.
def get_disaster_event_metadata():
  filepath = os.path.join(get_repo_root(), "config", "subject_page",
                          "disaster_event_spec.textproto")
  with open(filepath, 'r') as f:
    data = f.read()
    subject_page_config = subject_page_pb2.PageMetadata()
    text_format.Parse(data, subject_page_config)
    return subject_page_config


# Returns dict of place dcid to place type to geojson object. Geojson object is
# a feature collection where the geometry of the features do not follow the
# right hand rule.
def get_cached_geojsons():
  geojsons = {}
  for place in CACHED_GEOJSON_FILES:
    geojsons[place] = {}
    for place_type in CACHED_GEOJSON_FILES[place]:
      filename = CACHED_GEOJSON_FILES[place][place_type]
      filepath = os.path.join(get_repo_root(), 'config', 'geojson',
                              filename + '.json')
      with open(filepath, 'r') as f:
        geojsons[place][place_type] = json.load(f)
  return geojsons


# Returns a json object given the path (relative to root) to the json file
def get_json(path_relative_to_root):
  filepath = os.path.join(get_repo_root(), path_relative_to_root)
  with open(filepath, 'r') as f:
    data = json.load(f)
  return data


# Returns a summary of the available topic page summaries as an object:
# {
#   topicPlaceMap: {
#        <topic_id>: list of places that this config can be used for
#   },
#   topicNameMap: {
#       <topic_id>: <topic_name>
#   }
# }
def get_topics_summary(topic_page_configs):
  topic_place_map = {}
  topic_name_map = {}
  for topic_id, config_list in topic_page_configs.items():
    if len(config_list) < 1:
      continue
    topic_name_map[topic_id] = config_list[0].metadata.topic_name
    if topic_id not in topic_place_map:
      topic_place_map[topic_id] = []
    for config in config_list:
      topic_place_map[topic_id].extend(config.metadata.place_dcid)
  return {"topicPlaceMap": topic_place_map, "topicNameMap": topic_name_map}


def hash_id(user_id):
  return hashlib.sha256(user_id.encode('utf-8')).hexdigest()


def parse_date(date_string):
  parts = date_string.split("-")
  if len(parts) == 1:
    return datetime.strptime(date_string, "%Y")
  elif len(parts) == 2:
    return datetime.strptime(date_string, "%Y-%m")
  elif len(parts) == 3:
    return datetime.strptime(date_string, "%Y-%m-%d")
  else:
    raise ValueError("Invalid date: %s", date_string)


def is_up(url: str):
  if not url.lower().startswith('http'):
    raise ValueError(f'Invalid scheme in {url}. Expected http(s)://.')

  try:
    # Disable Bandit security check 310. http scheme is already checked above.
    # Codacity still calls out the error so disable the check.
    # https://bandit.readthedocs.io/en/latest/blacklists/blacklist_calls.html#b310-urllib-urlopen
    urllib.request.urlopen(url)  # nosec B310
    return True
  except urllib.error.URLError:
    return False


def check_backend_ready(urls: List[str]):
  total_sleep_seconds = 0
  up_status = {url: False for url in urls}
  while not all(up_status.values()):
    for url in urls:
      if up_status[url]:
        continue
      up_status[url] = is_up(url)
    if all(up_status.values()):
      break
    logging.info('%s not ready, waiting for %s seconds', urls,
                 _ready_check_sleep_seconds)
    time.sleep(_ready_check_sleep_seconds)
    total_sleep_seconds += _ready_check_sleep_seconds
    if total_sleep_seconds > _ready_check_timeout:
      raise RuntimeError('%s not ready after %s second' %
                         (urls, _ready_check_timeout))


def gzip_compress_response(raw_content, is_json):
  """Returns a gzip-compressed response object"""
  if is_json:
    raw_content = json.dumps(raw_content)
  compressed_content = gzip.compress(raw_content.encode('utf8'),
                                     GZIP_COMPRESSION_LEVEL)
  response = make_response(compressed_content)
  response.headers['Content-Length'] = len(compressed_content)
  response.headers['Content-Encoding'] = 'gzip'
  if is_json:
    response.headers['Content-Type'] = 'application/json'
  return response
