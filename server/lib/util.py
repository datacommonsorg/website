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
from datetime import date
from datetime import datetime
import gzip
import hashlib
import json
import logging
import os
import time
from typing import Dict, List, Set
import urllib

from flask import make_response
from google.protobuf import text_format

from server.config import subject_page_pb2
import server.lib.fetch as fetch
import server.services.datacommons as dc
import shared.model.loader as model_loader

_ready_check_timeout = 300  # seconds
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
    'dev': ['CA', 'asia'],
    'sdg': ['sdg']
}

# Levels range from 0 (fastest, least compression), to 9 (slowest, most
# compression).
GZIP_COMPRESSION_LEVEL = 3

DEFAULT_GEOJSON_PROP = 'geoJsonCoordinates'
UN_GEOJSON_PROP = 'geoJsonCoordinatesUN'

# Dict of place dcid to place type to filename of the geojson to cache for that
# place + place type combination.
# To generate cached geojson files, follow instructions/use the endpoint here:
# https://github.com/chejennifer/website/blob/generateCacheGeojsons/server/routes/api/choropleth.py#L201-L273
# TODO: add 'LatinAmericaAndCaribbean' and 'SubSaharanAfrica' for UN_GEOJSON_PROP.
CACHED_GEOJSON_FILES = {
    "Earth": {
        "Country": {
            DEFAULT_GEOJSON_PROP: "earth_country_dp13",
            UN_GEOJSON_PROP: "earth_country_dp13",
        }
    },
    "africa": {
        "Country": {
            DEFAULT_GEOJSON_PROP: "africa_country_dp10",
            UN_GEOJSON_PROP: "africa_country_dp10"
        }
    },
    "asia": {
        "Country": {
            DEFAULT_GEOJSON_PROP: "asia_country_dp10",
            UN_GEOJSON_PROP: "asia_country_dp10"
        }
    },
    "europe": {
        "Country": {
            DEFAULT_GEOJSON_PROP: "europe_country_dp6",
            UN_GEOJSON_PROP: "europe_country_dp6"
        }
    },
    "northamerica": {
        "Country": {
            DEFAULT_GEOJSON_PROP: "northamerica_country_dp13",
            UN_GEOJSON_PROP: "northamerica_country_dp13"
        }
    },
    "oceania": {
        "Country": {
            DEFAULT_GEOJSON_PROP: "oceania_country_dp13",
            UN_GEOJSON_PROP: "oceania_country_dp13"
        }
    },
    "southamerica": {
        "Country": {
            DEFAULT_GEOJSON_PROP: "southamerica_country_dp10",
            UN_GEOJSON_PROP: "southamerica_country_dp10"
        }
    },
    'AustraliaAndNewZealand': {
        "Country": {
            UN_GEOJSON_PROP: "australiaandnewzealand_country_dp6"
        }
    },
    'Caribbean': {
        "Country": {
            UN_GEOJSON_PROP: "caribbean_country_dp6"
        }
    },
    'CentralAmerica': {
        "Country": {
            UN_GEOJSON_PROP: "centralamerica_country_dp6"
        }
    },
    'CentralAsia': {
        "Country": {
            UN_GEOJSON_PROP: "centralasia_country_dp6"
        }
    },
    'ChannelIslands': {
        "Country": {
            UN_GEOJSON_PROP: "channelislands_country_dp6"
        }
    },
    'EasternAfrica': {
        "Country": {
            UN_GEOJSON_PROP: "easternafrica_country_dp6"
        }
    },
    'EasternAsia': {
        "Country": {
            UN_GEOJSON_PROP: "easternasia_country_dp6"
        }
    },
    'EasternEurope': {
        "Country": {
            UN_GEOJSON_PROP: "easterneurope_country_dp6"
        }
    },
    'EuropeanUnion': {
        "Country": {
            UN_GEOJSON_PROP: "europeanunion_country_dp6"
        }
    },
    'LatinAmericaAndCaribbean': {
        "Country": {
            UN_GEOJSON_PROP: "latinamericaandcaribbean_country_dp6"
        }
    },
    'Melanesia': {
        "Country": {
            UN_GEOJSON_PROP: "melanesia_country_dp6"
        }
    },
    'MiddleAfrica': {
        "Country": {
            UN_GEOJSON_PROP: "middleafrica_country_dp6"
        }
    },
    'NorthernAfrica': {
        "Country": {
            UN_GEOJSON_PROP: "northernafrica_country_dp6"
        }
    },
    'NorthernEurope': {
        "Country": {
            UN_GEOJSON_PROP: "northerneurope_country_dp6"
        }
    },
    'SouthEasternAsia': {
        "Country": {
            UN_GEOJSON_PROP: "southeasternasia_country_dp6"
        }
    },
    'SouthernAfrica': {
        "Country": {
            UN_GEOJSON_PROP: "southernafrica_country_dp6"
        }
    },
    'SouthernAsia': {
        "Country": {
            UN_GEOJSON_PROP: "southernasia_country_dp6"
        }
    },
    'SouthernEurope': {
        "Country": {
            UN_GEOJSON_PROP: "southerneurope_country_dp6"
        }
    },
    'SubSaharanAfrica': {
        "Country": {
            UN_GEOJSON_PROP: "subsaharanafrica_country_dp6"
        }
    },
    'WesternAfrica': {
        "Country": {
            UN_GEOJSON_PROP: "westernafrica_country_dp6"
        }
    },
    'WesternAsia': {
        "Country": {
            UN_GEOJSON_PROP: "westernasia_country_dp6"
        }
    },
    'WesternEurope': {
        "Country": {
            UN_GEOJSON_PROP: "westerneurope_country_dp6"
        }
    },
    # Americas
    'undata-geo/G00134000': {
        "Country": {
            UN_GEOJSON_PROP: "undata-geog00134000_country_dp6"
        }
    },
    "geoId/06": {
        "CensusTract": {
            DEFAULT_GEOJSON_PROP: "california_censustract"
        }
    },
    "geoId/12": {
        "CensusTract": {
            DEFAULT_GEOJSON_PROP: "florida_censustract"
        }
    },
    "geoId/36": {
        "CensusTract": {
            DEFAULT_GEOJSON_PROP: "newyorkstate_censustract"
        }
    },
    "geoId/48": {
        "CensusTract": {
            DEFAULT_GEOJSON_PROP: "texas_censustract"
        }
    },
}

NL_CHART_TITLE_FILES = [
    'chart_titles_by_sv.json', 'chart_titles_by_sv_sdg.json'
]

# Filter out observations with dates in the future for these variable DCIDs
# when finding the date of highest coverage
FILTER_FUTURE_OBSERVATIONS_FROM_VARIABLES = frozenset(["Count_Person"])


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


# Returns generated summaries for place explorer.
def get_place_summaries():
  filepath = os.path.join(get_repo_root(), "config", "summaries",
                          "place_summaries.json")
  with open(filepath, 'r') as f:
    return json.load(f)


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
  chart_titles = {}
  for file in NL_CHART_TITLE_FILES:
    filepath = os.path.join(get_repo_root(), "config", "nl_page", file)
    with open(filepath, 'r') as f:
      chart_titles.update(json.load(f))
  return chart_titles


# Returns display titles for properties used in NL as a dict of property dcid
# to a dict with different strings to use including displayName and titleFormat
# TODO: need to validate that every titleFormat has entity in it
def get_nl_prop_titles() -> Dict[str, Dict[str, str]]:
  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "prop_titles.json")
  with open(filepath, 'r') as f:
    return json.load(f)


# Returns a set of SVs that should not have Per-capita.
# TODO: Eventually read this from KG.
def get_nl_no_percapita_vars():
  # These SVs include both manually curated dcids and those that have a
  # measurementDenominator, excluding those from _SV_PARTIAL_DCID_NO_PC,
  # which are already filtered in is_percapita_relevant (in shared.py).
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


# Returns a set of SVs that have percentage units.
# (Generated from http://gpaste/6422443047518208)
def get_sdg_percent_vars():
  filepath = os.path.join(get_repo_root(), "config", "nl_page",
                          "sdg_percent_vars.csv")
  sdg_percent_vars = set()
  with open(filepath, 'r') as f:
    for row in csv.DictReader(f):
      sv = row['variable_measured'].strip()
      sdg_percent_vars.add(sv)
    return sdg_percent_vars


def get_special_dc_non_countery_only_vars():
  vars = set()
  for fname in ['sdg_non_country_vars.json', 'undata_non_country_vars.json']:
    filepath = os.path.join(get_repo_root(), "config", "nl_page", fname)
    with open(filepath, 'r') as fp:
      data = json.load(fp)
    vars.update(data.get('variables', []))
  return vars


# Returns common event_type_spec for all disaster event related pages.
def get_disaster_event_metadata():
  filepath = os.path.join(get_repo_root(), "config", "subject_page",
                          "disaster_event_spec.textproto")
  with open(filepath, 'r') as f:
    data = f.read()
    subject_page_config = subject_page_pb2.PageMetadata()
    text_format.Parse(data, subject_page_config)
    return subject_page_config


# Returns dict of place dcid to place type to geojsonProp to geojson object.
# Geojson object is a feature collection where the geometry of the features do
# not follow the right hand rule.
def get_cached_geojsons():
  geojsons = {}
  for place in CACHED_GEOJSON_FILES:
    geojsons[place] = {}
    for place_type in CACHED_GEOJSON_FILES[place]:
      geojsons[place][place_type] = {}
      for geo_json_prop in CACHED_GEOJSON_FILES[place][place_type]:
        filename = CACHED_GEOJSON_FILES[place][place_type][geo_json_prop]
        filepath = os.path.join(get_repo_root(), 'config', 'geojson',
                                geo_json_prop, filename + '.json')
        with open(filepath, 'r') as f:
          geojsons[place][place_type][geo_json_prop] = json.load(f)
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


def fetch_highest_coverage(parent_entity: str,
                           child_type: str,
                           variables: List[str],
                           all_facets: bool,
                           facet_ids: List[str] = None):
  """
  Fetches the latest available data with the best coverage for the given a
  parent entity, child type, variables, and facets. If multiple variables are
  passed in, selects dates with highest coverage independently for each
  variable.

  Response format:
  {
    "facets": {
      <facet_id>: {<facet object>}
    },
    "data": {
      <var_dcid>: {
        <entity_dcid>: {
          <observation point(s)>
        }
      }
    }
  }
  """
  MAX_DATES_TO_CHECK = 5
  MAX_YEARS_TO_CHECK = 5
  point_responses = []
  series_dates_response = dc.get_series_dates(parent_entity, child_type,
                                              variables)
  facet_ids_set = set(facet_ids or [])
  for observation_entity_counts_by_date in series_dates_response[
      'datesByVariable']:
    # Each observation_entity_counts_by_date contains the observation counts by date
    variable = observation_entity_counts_by_date['variable']
    best_coverage_date = _get_highest_coverage_date(
        observation_entity_counts_by_date=observation_entity_counts_by_date,
        facet_ids=facet_ids_set,
        max_dates_to_check=MAX_DATES_TO_CHECK,
        max_years_to_check=MAX_YEARS_TO_CHECK)
    if not best_coverage_date:
      # No best coverage date means we couldn't find any variable observations
      # Add a blank point response in this case
      point_responses.append({'data': {variable: {}}})
      continue
    point_responses.append(
        fetch.point_within_core(parent_entity, child_type, [variable],
                                best_coverage_date, all_facets, facet_ids))
  combined_point_response = {"facets": {}, "data": {}}
  for point_response in point_responses:
    combined_point_response["facets"].update(point_response.get("facets", {}))
    combined_point_response["data"].update(point_response.get("data", {}))
  return combined_point_response


def _get_highest_coverage_date(observation_entity_counts_by_date,
                               facet_ids: Set[str], max_dates_to_check: int,
                               max_years_to_check: int) -> str | None:
  """
  Heuristic for fetching "latest data with highest coverage":
  Choose the date with the most data coverage from either:
  (1) last N observation dates
  (2) M years from the most recent observation date
  whichever set has more dates

  Args:
    observation_entity_counts_by_date: Part of "dc.get_series_dates" response
      containing variable observation counts by date and entity
    facet_ids: (optional) Only consider observation counts from these facets
    max_dates_to_check: Only consider entity counts going back this number of
      observation groups
    max_years_to_check: Only consider entity counts going back this number of
      years
  """
  # Get observation dates in descending order
  descending_observation_dates = [
      observation_date for observation_date in list(
          reversed(observation_entity_counts_by_date.get(
              'observationDates', [])))
  ]
  # Exclude erroneous data for particular variables with dates in the future
  # TODO: Remove this check once data is corrected in b/327667797
  if observation_entity_counts_by_date[
      'variable'] in FILTER_FUTURE_OBSERVATIONS_FROM_VARIABLES:
    todays_date = str(date.today())
    descending_observation_dates = [
        observation_date for observation_date in descending_observation_dates
        if observation_date['date'] < todays_date
    ]
  if len(descending_observation_dates) == 0:
    return None
  # Heuristic to fetch the "max_dates_to_check" most recent
  # observation dates or observation dates going back
  # "max_years_to_check" years, whichever is greater
  cutoff_year = str(date.today().year - max_years_to_check)
  latest_observation_dates_from_year = [
      o for o in descending_observation_dates if o['date'] > cutoff_year
  ]
  obs_dates_cutoff = max(len(latest_observation_dates_from_year),
                         max_dates_to_check)
  observation_dates = descending_observation_dates[:obs_dates_cutoff]

  # finds the greatest entity (observation) count among all facets in the
  # given list of observation dates
  date_counts = [{
      'date':
          obs['date'],
      'count':
          max([
              entity_count_item for entity_count_item in obs['entityCount'] if
              (len(facet_ids) == 0 or entity_count_item['facet'] in facet_ids)
          ],
              key=lambda item: item['count'])['count']
  } for obs in observation_dates]
  best_coverage = max(date_counts, key=lambda date_count: date_count['count'])
  return best_coverage['date']


def get_vertex_ai_models():
  vertex_ai_indexes = model_loader.load_indexes()
  reranking_models = model_loader.load_models('RERANKING')
  return dict(vertex_ai_indexes, **reranking_models)
