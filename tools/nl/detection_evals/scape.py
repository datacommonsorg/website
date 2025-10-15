# Copyright 2025 Google LLC
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
import logging
from typing import Any, List

from eval_models import DetectedDate
from eval_models import DetectedPlace
from eval_models import NlApiScrape
from eval_models import Ranking
from eval_models import ResponseStatus
from eval_models import VariableResponse
import requests
from utils import get_date_range_strings
from utils import today


# Extract Date from the Query Response
def _parse_dates(dbg_info: Any) -> List[DetectedDate]:
  date_classification = dbg_info.get('date_classification', '')

  if not date_classification or date_classification == '<None>':
    return []

  attributes = eval(date_classification)

  if not attributes.dates or len(attributes.dates) > 1:
    print('dates list length != 1')
    return []

  if attributes.is_single_date:
    start_date = str(attributes.dates[0].year)
    if attributes.dates[0].month:
      start_date = f'{start_date}-{attributes.dates[0].month:02d}'
    return [DetectedDate(base_date=start_date)]

  detected_date = attributes.dates[0]
  date_range = get_date_range_strings(detected_date)
  if date_range == ('', ''):
    return [DetectedDate()]
  start_date = date_range[0] if date_range[0] else today()
  end_date = date_range[1] if date_range[1] else today()
  return [DetectedDate(base_date=start_date, end_date=end_date)]


# Extract Location and sub-place type from the Query Response
def _parse_places(id: int, query: str, dbg_info: Any) -> List[DetectedPlace]:
  # 1. Identify sub_place_type such as "County" or "State"
  contained_in_classification = dbg_info.get(
      'contained_in_classification',
      '<None>')  # "<None>"" matches the 'default' value returned by debug_info
  sub_place_type = contained_in_classification.split(
      '.')[-1] if contained_in_classification != '<None>' else None
  if sub_place_type and 'DEFAULT_TYPE' in sub_place_type:
    sub_place_type = None

  # 2. Identify the detected place dcids
  places = []

  detection_logs = dbg_info.get('query_detection_debug_logs', {})
  # print(detection_logs)
  # print(contained_in_classification)

  try:
    detected_places = detection_logs.get('place_resolution',
                                         {}).get('dc_resolved_places', {})
    for detected_place in detected_places:
      places.append(
          DetectedPlace(dcid=detected_place['dcid'],
                        sub_place_type=sub_place_type))
  except AttributeError as e:
    logging.info(f'[places] no dc_resolved_places; {id} ("{query}")')
    if sub_place_type:
      logging.debug(f'[places] detected only sub_place_type; {id} ("{query}")')
      places.append(DetectedPlace(dcid='', sub_place_type=sub_place_type))
      return places

    llm_response = dbg_info.get('llm_response', {})
    if llm_response:
      # TODO: verify if skipping llm_response when sub_place_type is present is correct
      logging.info(f'[places] llm_response:", )',
                   dbg_info.get('llm_response', {}))

      llm_sub_place = llm_response.get('SUB_PLACE_TYPE', '')
      if 'DEFAULT_TYPE' in llm_sub_place:
        llm_sub_place = None
      if llm_sub_place:
        places.append(DetectedPlace(dcid='', sub_place_type=llm_sub_place))
    else:
      logging.debug(f'[places] no place detected; {id} ("{query}")')

  return places


# Extract Nested DCIDs from a given topic
def _unfurl_group(topic_dcid: Any, processed_topics: Any) -> List[Any]:
  dcids = []
  processed_topic = processed_topics.get(topic_dcid, {})

  for peer_group in processed_topic.get('peer_groups', []):
    dcids.extend(
        peer_group[1])  # peer group structure is [peer_group_dcid, [stat_vars]]

  for sub_topic in processed_topic.get('sub_topics', []):
    dcids.extend(_unfurl_group(sub_topic, processed_topics))

  dcids.extend(processed_topic.get('svs', []))

  return dcids


# Extract DCIDs
def _unfurl_dcids(dcids: Any, processed_topics, id: int,
                  query: float) -> List[str]:
  flat_vars = []
  for dcid in dcids:
    if dcid.startswith('dc/topic'):
      if dcid not in processed_topics:
        logging.info(f'[vars] topic not processed: {dcid}; {id} ("{query}")')
        continue
      flat_vars.extend(_unfurl_group(dcid, processed_topics))
    else:
      flat_vars.append(dcid)

  return flat_vars


# Extract Statistical Variables from the Query Response
def _parse_variables(id: int, query: str,
                     dbg_info: Any) -> List[VariableResponse]:

  sv_matching = dbg_info.get('sv_matching', {})
  detection_type = dbg_info.get('detection_type')
  query_detection_logs = dbg_info.get('query_detection_debug_logs')
  info_logs = dbg_info.get('counters', {}).get('INFO', {})

  topics_processed = {}
  for topic in info_logs.get('topics_processed', []):
    topics_processed.update(topic)

  single_sv_best_score = (sv_matching.get('CosineScore', [0]) + [0])[0]

  multi_sv_candidate = None
  if 'MultiSV' in sv_matching:
    for candidate in sv_matching.get('MultiSV', {}).get('Candidates', []):
      if candidate['DelimBased'] and len(candidate['Parts']) == 2:
        # 0.05 matches the logic in
        # https://github.com/datacommonsorg/website/blob/12f305f6525bd5d34d45d564503f827dcad2a9ee/shared/lib/constants.py#L458
        if candidate['AggCosineScore'] + 0.05 >= single_sv_best_score:
          variables = []
          multi_sv_candidate = candidate
          for part in multi_sv_candidate['Parts']:
            variables.append(
                VariableResponse(search_label=part['QueryPart'],
                                 dcids=_unfurl_dcids(part['SV'],
                                                     topics_processed, id,
                                                     query)))
          return variables

  ranking = None
  if 'ranking_classification' in dbg_info:
    ranking_classification = dbg_info.get('ranking_classification')
    if 'HIGH' in ranking_classification:
      ranking = Ranking.HIGH
    elif 'LOW' in ranking_classification:
      ranking = Ranking.LOW

  if 'RICH' in dbg_info.get('superlative_classification', ''):
    search_label = "RICH"
    var_dcids = _unfurl_dcids(
        info_logs.get('filtered_svs', [])[0], topics_processed, id, query)

  elif 'POOR' in dbg_info.get('superlative_classification', ''):
    search_label = "POOR"
    var_dcids = _unfurl_dcids(topics_processed.keys(), topics_processed, id,
                              query)

  elif detection_type == 'Hybrid - Heuristic Based' or detection_type == 'Heuristic Based':
    search_label = query_detection_logs.get('query_transformations', {}).get(
        'sv_detection_query_stop_words_removal', '')
    if not search_label:
      logging.warning(
          f'[vars] no sv_detection_query_stop_words_removal, using empty str; {id} ("{query}") {query_detection_logs} {sv_matching}'
      )
    var_dcids = _unfurl_dcids(
        info_logs.get('filtered_svs', [])[0], topics_processed, id, query)

  elif detection_type == 'Hybrid - LLM Fallback' or detection_type == 'LLM Based':
    variable_strs = query_detection_logs['llm_response']['METRICS']
    if len(variable_strs) > 1:
      logging.warning('[vars] multiple llm detected statvars')

    search_label = variable_strs[0]
    var_dcids = _unfurl_dcids(
        info_logs.get('filtered_svs', [])[0], topics_processed, id, query)

  else:
    logging.warning(f'[vars] different detection mode; {id} ("{query}")')

  return [
      VariableResponse(search_label=search_label, dcids=var_dcids, rank=ranking)
  ]


# Transform Query Response into NlApiScrape
def scrape_query(id: int,
                 query: str,
                 host_website: str,
                 detector_type: str = 'hybrid') -> NlApiScrape:
  response = None
  query_response = None
  scrape_date = today()

  try:
    response = requests.post(
        f'{host_website}/api/explore/detect-and-fulfill?q={query}&detector={detector_type}',
        json={},
        timeout=None)

    if response.status_code != 200:
      logging.warning(
          f'[api]  NL API request failed with status code {response.status_code}; {id} ("{query}")'
      )
      return NlApiScrape(id=id,
                         query=query,
                         dates=[],
                         places=[],
                         variables=[],
                         api_response_status=ResponseStatus.ERROR,
                         scrape_date=scrape_date)
    query_response = response.json()

  except json.JSONDecodeError as e:
    raise json.JSONDecodeError(
        f'[api] NL API response is not valid JSON; {id} ("{query}"); {e}')

  logging.debug(query_response)

  dbg_info = query_response.get('debug', {})

  if dbg_info.get('blocked', False):
    logging.warning(f'[api] NL API blocked request; {id} ("{query}")')
    return NlApiScrape(id=id,
                       query=query,
                       dates=[],
                       places=[],
                       variables=[],
                       api_blocked=True,
                       scrape_date=scrape_date)

  dates = _parse_dates(dbg_info)

  places = _parse_places(id, query, dbg_info)

  variables = _parse_variables(id, query, dbg_info)

  return NlApiScrape(id=id,
                     query=query,
                     dates=dates,
                     places=places,
                     variables=variables,
                     scrape_date=scrape_date)
