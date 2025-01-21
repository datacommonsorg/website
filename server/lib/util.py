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
import datetime
from functools import wraps
import gzip
import hashlib
from itertools import groupby
import json
import logging
from operator import itemgetter
import os
import time
from typing import Dict, List, Set
import urllib

from flask import jsonify
from flask import make_response
from flask import request
from google.cloud import storage
from google.cloud.exceptions import NotFound
from google.protobuf import text_format

from server.config import subject_page_pb2
import server.lib.fetch as fetch
import server.services.datacommons as dc

_ready_check_timeout = 300  # seconds
_ready_check_sleep_seconds = 5

# This has to be in sync with static/js/shared/util.ts
PLACE_EXPLORER_CATEGORIES = [
    "economics",
    "economics_new",
    "health",
    "health_new",
    "equity",
    "equity_new",
    "crime",
    "crime_new",
    "education",
    "education_new",
    "demographics",
    "demographics_new",
    "housing",
    "housing_new",
    "environment",
    "environment_new",
    "energy",
    "energy_new",
    "health_new",
    "crime_new",
    "demographics_new",
    "economics_new",
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


def get_feature_flag_bucket_name() -> str:
  """Returns the bucket name containing the feature flags."""
  env_for_bucket = os.environ.get('FLASK_ENV')
  if env_for_bucket == 'local':
    env_for_bucket = 'autopush'
  elif env_for_bucket == 'production':
    env_for_bucket = 'prod'
  return 'datcom-website-' + env_for_bucket + '-resources'


def load_feature_flags():
  """Loads the feature flags into app config."""
  storage_client = storage.Client()
  bucket_name = get_feature_flag_bucket_name()
  try:
    bucket = storage_client.get_bucket(bucket_name)
  except NotFound:
    logging.error("Bucket not found: " + bucket_name)
    return {}

  blob = bucket.get_blob("feature_flags.json")
  data = {}
  if blob:
    try:
      data = json.loads(blob.download_as_bytes())
    except json.JSONDecodeError:
      logging.warning("Loading feature flags failed to decode JSON.")
    except TypeError:
      logging.warning("Loading feature flags encountered a TypeError.")
  else:
    logging.warning("Feature flag file not found in the bucket.")

  # Create the dictionary using a dictionary comprehension
  feature_flag_dict = {
      flag["name"]: flag["enabled"]
      for flag in data
      if 'name' in flag and 'enabled' in flag
  }
  return feature_flag_dict


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
    return datetime.datetime.strptime(date_string, "%Y")
  elif len(parts) == 2:
    return datetime.datetime.strptime(date_string, "%Y-%m")
  elif len(parts) == 3:
    return datetime.datetime.strptime(date_string, "%Y-%m-%d")
  else:
    raise ValueError("Invalid date: %s", date_string)


def is_up(url: str):
  if not url.lower().startswith('http'):
    raise ValueError(f'Invalid scheme in {url}. Expected http(s)://.')

  try:
    # Disable Bandit security check 310. http scheme is already checked above.
    # Codacity still calls out the error so disable the check.
    # https://bandit.readthedocs.io/en/latest/blacklists/blacklist_calls.html#b310-urllib-urlopen
    code = urllib.request.urlopen(url).getcode()  # nosec B310
    if code != 200:
      return False
  except urllib.error.URLError:
    return False
  logging.info("%s is up running", url)
  return True


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


def flatten_obs_series_response(obs_series_response):
  """
  Flatten the observation series response into a list of dictionaries.

  This function processes an observation series response, extracting and 
  flattening the nested data structure into a simple list of dictionaries. 
  Each dictionary in the list represents a single observation with the 
  following keys: 'variable', 'entity', 'date', 'value', and 'facet'.

  Example:
  >>> obs_series_response = {
          "byVariable": {
              "Count_Person": {
                  "byEntity": {
                      "country/USA": {
                          "orderedFacets": [
                              {
                                  "facetId": "2176550201",
                                  "observations": [
                                      {"date": "1900", "value": 76094000},
                                      {"date": "1901", "value": 77584000}
                                  ]
                              }
                          ]
                      }
                  }
              }
          }
      }
  >>> flatten_obs_series_response(obs_series_response)
  [
      {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
      {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'}
  ]
  """
  flattened_observations = []
  for variable, variable_entry in obs_series_response["byVariable"].items():
    for entity, variable_entity_entry in variable_entry["byEntity"].items():
      for ordered_facet in variable_entity_entry.get('orderedFacets', []):
        for observation in ordered_facet['observations']:
          flattened_observations.append({
              'date': observation['date'],
              'entity': entity,
              'facet': ordered_facet['facetId'],
              'value': observation.get('value'),
              'variable': variable
          })
  return flattened_observations


def flattened_observations_to_dates_by_variable(
    flattened_observations: List[dict]) -> List[dict]:
  """
  Group flattened observation data by variable, then date, then facet, and count entities for each facet.

  This function takes a list of flattened observation dictionaries and organizes them into a nested 
  structure grouped by variable, date, and facet. The resulting structure provides counts of entities 
  for each facet on each date for each variable.
                  
  Example:
  >>> flattened_observations = [
          {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
          {'date': '1900', 'entity': 'country/USA', 'facet': '2176550201', 'value': 76094000, 'variable': 'Count_Person'},
          {'date': '1901', 'entity': 'country/USA', 'facet': '2176550201', 'value': 77584000, 'variable': 'Count_Person'},
          {'date': '1901', 'entity': 'country/CAN', 'facet': '2176550201', 'value': 5500000, 'variable': 'Count_Person'}
      ]
  >>> flattened_observations_to_dates_by_variable(flattened_observations)
  [
      {
          'variable': 'Count_Person',
          'observationDates': [
              {
                  'date': '1900',
                  'entityCount': [
                      {
                          'facet': '2176550201',
                          'count': 2
                      }
                  ]
              },
              {
                  'date': '1901',
                  'entityCount': [
                      {
                          'facet': '2176550201',
                          'count': 2
                      }
                  ]
              }
          ]
      }
  ]
  """
  # Final result is grouped by variable, then date, then facet, then count.
  dates_by_variable = []
  flattened_observations.sort(key=itemgetter('variable'))
  # Group by variable
  for variable_key, observations_for_variable_group in groupby(
      flattened_observations, key=itemgetter('variable')):
    dates_by_variable_item = {'variable': variable_key, 'observationDates': []}
    dates_by_variable.append(dates_by_variable_item)
    observations_for_variable = list(observations_for_variable_group)
    observations_for_variable.sort(key=itemgetter('date'))
    # Group by date
    for date_key, observations_for_date_group in groupby(
        observations_for_variable, key=itemgetter('date')):
      observation_dates_item = {'date': date_key, 'entityCount': []}
      dates_by_variable_item['observationDates'].append(observation_dates_item)
      observations_for_date = list(observations_for_date_group)
      observations_for_date.sort(key=itemgetter('facet'))
      # Group by facet
      for facet_key, observations_for_facet_group in groupby(
          observations_for_date, key=itemgetter('facet')):
        # Count all records iwth this variable, date, and facet
        entity_count_item = {
            'count': len(list(observations_for_facet_group)),
            'facet': facet_key
        }
        observation_dates_item['entityCount'].append(entity_count_item)
  return dates_by_variable


def get_series_dates_from_entities(entities: List[str], variables: List[str]):
  """
  Get observation series dates by place DCIDs and variables.

  This function retrieves observation series data for the specified entities and variables,
  flattens the data, and then organizes it by variable, date, and facet. The result includes
  the grouped observation dates and the facets information from the observation series response.

  Parameters:
  entities (List[str]): A list of entity DCIDs (place identifiers) for which to retrieve data.
  variables (List[str]): A list of variable names to retrieve data for.

  Returns:
  dict: A dictionary with two keys:
        - 'datesByVariable' (List[dict]): A list of dictionaries where each dictionary contains:
            - 'variable' (str): The variable dcid.
            - 'observationDates' (List[dict]): A list of dictionaries for each date, each containing:
                - 'date' (str): The date of the observation.
                - 'entityCount' (List[dict]): A list of dictionaries for each facet, each containing:
                    - 'facet' (str): The facet ID.
                    - 'count' (int): The number of entities for this facet on this date.
        - 'facets' (dict): The facets information from the observation series response.
        
  Example:
  >>> entities = ["country/USA", "country/CAN"]
  >>> variables = ["Count_Person", "Count_Household"]
  >>> result = get_series_dates_from_entities(entities, variables)
  >>> print(result)
  {
      'datesByVariable': [
          {
              'variable': 'Count_Person',
              'observationDates': [
                  {
                      'date': '1900',
                      'entityCount': [
                          {
                              'facet': '2176550201',
                              'count': 1
                          }
                      ]
                  },
                  {
                      'date': '1901',
                      'entityCount': [
                          {
                              'facet': '2176550201',
                              'count': 1
                          }
                      ]
                  }
              ]
          },
          {
              'variable': 'Count_Household',
              'observationDates': [
                  {
                      'date': '1900',
                      'entityCount': [
                          {
                              'facet': '2176550202',
                              'count': 1
                          }
                      ]
                  },
                  {
                      'date': '1901',
                      'entityCount': [
                          {
                              'facet': '2176550202',
                              'count': 1
                          }
                      ]
                  }
              ]
          }
      ],
      'facets': {
          '2176550201': {
            'importName': 'CensusACS5YearSurvey_SubjectTables_S0101',
            'measurementMethod': 'CensusACS5yrSurveySubjectTable',
            'provenanceUrl': 'https://data.census.gov/table?q=S0101:+Age+and+Sex&tid=ACSST1Y2022.S0101'
          },
          '2176550202': {
            'importName': 'CensusACS5YearSurvey_SubjectTables_S2602',
            'measurementMethod': 'CensusACS5yrSurveySubjectTable',
            'provenanceUrl': 'https://data.census.gov/cedsci/table?q=S2602&tid=ACSST5Y2019.S2602'
          }
      }
  }
  """
  obs_series_response = dc.obs_series(entities=entities, variables=variables)
  flattened_observations = flatten_obs_series_response(obs_series_response)
  dates_by_variable = flattened_observations_to_dates_by_variable(
      flattened_observations)

  result = {
      'datesByVariable': dates_by_variable,
      'facets': obs_series_response.get('facets', {})
  }
  return result


def _get_highest_coverage_date(observation_dates_by_variable,
                               facet_ids: Set[str], max_dates_to_check: int,
                               max_years_to_check: int) -> str | None:
  """
  Heuristic for fetching "latest date with highest coverage":
  Choose the date with the most data coverage from either:
  (1) last N observation dates
  (2) M years from the most recent observation date
  whichever set has more dates

  Args:
    observation_dates_by_variable: Part of "dc.get_series_dates" response
      containing observation counts by variable, date and entity
    facet_ids: (optional) Only consider observation counts from these facets
    max_dates_to_check: Only consider entity counts going back this number of
      observation groups
    max_years_to_check: Only consider entity counts going back this number of
      years
  """
  recent_date_counts_dict = {}
  for observation_entity_counts_by_date in observation_dates_by_variable:
    recent_date_counts = _get_recent_date_counts(
        observation_entity_counts_by_date, facet_ids, max_dates_to_check,
        max_years_to_check)
    for date_count in recent_date_counts:
      date_count_date = date_count["date"]
      if not date_count_date in recent_date_counts_dict:
        recent_date_counts_dict[date_count_date] = 0
      recent_date_counts_dict[date_count_date] += date_count["count"]

  highest_coverage_date = None
  highest_count = 0
  for coverage_date, count in recent_date_counts_dict.items():
    if count > highest_count:
      highest_count = count
      highest_coverage_date = coverage_date
  return highest_coverage_date


def _get_recent_date_counts(observation_entity_counts_by_date,
                            facet_ids: Set[str], max_dates_to_check: int,
                            max_years_to_check: int) -> List[Dict]:
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
    todays_date = str(datetime.date.today())
    descending_observation_dates = [
        observation_date for observation_date in descending_observation_dates
        if observation_date['date'] < todays_date
    ]
  if len(descending_observation_dates) == 0:
    return []
  # Heuristic to fetch the "max_dates_to_check" most recent
  # observation dates or observation dates going back
  # "max_years_to_check" years, whichever is greater
  cutoff_year = str(datetime.date.today().year - max_years_to_check)
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
  return date_counts


def fetch_highest_coverage(variables: List[str],
                           all_facets: bool,
                           entities: List[str] | None = None,
                           parent_entity: str | None = None,
                           child_type: str | None = None,
                           facet_ids: List[str] | None = None):
  """
  Fetches the latest available data with the best coverage for the given
  entities (list of entities OR (parent entity and child type)), variables, and
  facets.

  - If multiple variables are passed in, selects dates with the overall highest
    coverage among all variables.
  - If all_facets is True, return observations from all available facets.
    Otherwise returns observations from a single facet.
  - If facet_ids is set, only returns observations from those facets

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
  if (entities is None) and ((parent_entity is None) or (child_type is None)):
    raise ValueError(
        "Must provide either 'entities' OR ('parent_entity' AND 'child_type') parameters to fetch_highest_coverage"
    )
  MAX_DATES_TO_CHECK = 5
  MAX_YEARS_TO_CHECK = 5
  if entities is not None:
    series_dates_response = get_series_dates_from_entities(entities, variables)
  else:
    series_dates_response = dc.get_series_dates(parent_entity, child_type,
                                                variables)
  facet_ids_set = set(facet_ids or [])

  observation_dates_by_variable = series_dates_response['datesByVariable']
  highest_coverage_date = _get_highest_coverage_date(
      observation_dates_by_variable,
      facet_ids=facet_ids_set,
      max_dates_to_check=MAX_DATES_TO_CHECK,
      max_years_to_check=MAX_YEARS_TO_CHECK)

  # If no highest coverage date is found, return an empty response
  if not highest_coverage_date:
    return {"data": {variable: {} for variable in variables}, "facets": {}}

  # Return observations with the highest coverage date
  if entities is not None:
    point_response = fetch.point_core(entities, variables,
                                      highest_coverage_date, all_facets)
  else:
    point_response = fetch.point_within_core(parent_entity, child_type,
                                             variables, highest_coverage_date,
                                             all_facets, facet_ids)
  return point_response


def post_body_cache_key():
  """
  Builds flask cache key for GET and POST requests.
  
  GET: Key is URL path + query string parameters. Example: '/test?key=value'
  POST: (Requires Content-Type:application/json): Key is URL path + query string
  + JSON body. Example: '/test?key=value,{"jsonkey":"jsonvalue"}'
  
  """
  full_path = request.full_path
  if request.method == 'POST':
    body_object = request.get_json()
    post_body = json.dumps(body_object, sort_keys=True)
    cache_key = f'{full_path},{post_body}'
  else:
    cache_key = full_path
  return cache_key


def log_execution_time(func):
  """
  Decorator that logs the execution time of a Flask route.
  """

  @wraps(func)
  def wrapper(*args, **kwargs):
    start_time = time.time()
    response = func(*args, **kwargs)
    end_time = time.time()
    execution_time = end_time - start_time
    logging.info(
        f"Route {request.method} {request.path} took {execution_time:.4f} seconds to complete."
    )
    return response

  return wrapper


def error_response(message, status_code=400):
  """
  Generate a JSON error response payload.

  Args:
      message (str): A human-readable message explaining the error.
      status_code (int): The HTTP status code of the error. Default: 400.

  Returns:
      response: A Flask `Response` object with a JSON payload and the given status code.
  """
  error_response = {
      "status": "error",
      "message": message,
      "code": status_code,
  }
  return jsonify(error_response), status_code
