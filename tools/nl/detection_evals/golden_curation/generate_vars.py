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

import csv
from dataclasses import dataclass
import json
from typing import Dict, List

from absl import app
from absl import flags
import requests
from utils import get_hierarchy_format
from utils import get_merged_var_str_dict
from utils import get_queries
from utils import QueryInfo

FLAGS = flags.FLAGS
flags.DEFINE_string('input_folder', 'input',
                    'The input directory of files with queries to get svs for')
flags.DEFINE_string(
    'output_folder', 'output',
    'The output directory to save results of getting svs for each query')
flags.DEFINE_string(
    'topic_cache', 'topic_cache.json',
    'file path to a copy of the topic cache at server/config/nl_page/topic_cache.json'
)

_MAX_TOPICS_DEPTH = 3
_DEFAULT_SVGS_TO_QUERY = ['', 'SDG']
_SVG_TO_EMBEDDING_IDX = {
    "Agriculture": "agriculture_uae_mem",
    "Crime": "crime_uae_mem",
    "SDG": "sdg_uae_mem",
    "Demographics": "demographics_uae_mem",
    "Economy": "economy_uae_mem",
    "Education": "education_uae_mem",
    "Environment": "environment_uae_mem",
    "Energy": "energy_uae_mem",
    "Health": "health_uae_mem",
    "Housing": "housing_uae_mem",
}
_DEFAULT_PLACE = 'USA'
_VAR_LIMIT = 100
_TOPIC_PREFIX = 'dc/topic'


@dataclass
class VarInfo:
  dcid: str
  score: str


def get_topic_cache(topic_cache_file) -> Dict[str, List[str]]:
  """
  Reads a topic cache JSON file and constructs a mapping from each topic DCID to its associated children.

  Args:
    topic_cache_file (str): Path to the JSON file containing the topic cache.

  Returns:
    Dict[str, List[str]]: A dictionary mapping each topic DCID (as a string) to a list of its children,
    which are aggregated from 'memberList' and 'relevantVariableList' fields in the JSON.
  """
  result = {}
  with open(topic_cache_file, 'r') as f:
    topic_cache = json.load(f)
    for node in topic_cache.get('nodes', []):
      children = node.get('memberList', []) + node.get('relevantVariableList',
                                                       [])
      for dcid in node.get('dcid', []):
        result[dcid] = children
  return result


def get_vars_from_nl_response(query_response) -> List[VarInfo]:
  """
  Extracts variable information from a natural language query response.
  This function processes the debug information in the provided query response to extract variable dcids and their associated cosine similarity scores.

  Args:
    query_response (dict): The response object from a natural language query, expected to contain debug information with variable details.

  Returns:
    List[VarInfo]: A list of VarInfo objects, each containing a dcid and its corresponding cosine similarity score.
  """
  debug_info = query_response.get('debug', {})
  var_set = set()
  var_to_score = {}
  debug_sv_info = debug_info.get('sv_matching', {})
  for idx, v in enumerate(debug_sv_info.get('SV', [])):
    var_to_score[v] = debug_sv_info['CosineScore'][idx]
  for v in debug_info.get('counters', {}).get('INFO',
                                              {}).get('filtered_svs', [[]])[0]:
    var_set.add(v)
  for multi in debug_sv_info.get('MultiSV', {}).get('Candidates', []):
    for p in multi.get('Parts', []):
      scores = p.get('CosineScore', [])
      for idx, v in enumerate(p.get('SV', [])):
        if scores[idx] < 0.7:
          break
        var_set.add(v)
        var_to_score[v] = var_to_score.get(v, scores[idx])
  var_result = []
  for v in var_set:
    var_result.append(VarInfo(v, var_to_score[v]))
  return var_result


def get_var_dcids(var_string, svg_list):
  """
  Retrieve and trim variable DCIDs associated with a given variable string and a list of SVGs.

  Args:
    var_string (str): The variable string to query for associated variables.
    svg_list (list of str): List of SVGs to search within for associated variables.

  Returns:
    list: A list of variable DCIDs associated with the input variable string and SVGs.
  """
  var_list = []
  # query the index for each svg to find all the associated vars for the var string
  for svg in svg_list:
    embedding_idx = _SVG_TO_EMBEDDING_IDX.get(svg)
    idx_param = f'&idx={embedding_idx}' if embedding_idx else ''
    request_query = f'{var_string} {_DEFAULT_PLACE}'
    nl_response = requests.post(
        f'http://localhost:8080/api/explore/detect?q={request_query}{idx_param}',
        json={},
        timeout=None)
    var_list.extend(get_vars_from_nl_response(nl_response.json()))
  trimmed_vars = get_trimmed_vars(var_list)
  return trimmed_vars


def get_trimmed_vars(var_list: List[VarInfo]) -> List[str]:
  """
  Returns a list of unique variable DCIDs from the input list, sorted by score in descending order and limited to a maximum number.

  Args:
    var_list (List[VarInfo]): A list of VarInfo objects, each containing a 'dcid' and a 'score' attribute.

  Returns:
    List[str]: A list of unique variable DCIDs, sorted by score (highest first), limited to _VAR_LIMIT entries.
  """
  sorted_vars_by_score = sorted(var_list, key=lambda x: x.score, reverse=True)
  trimmed_vars = []
  seen_vars = set()
  for v in sorted_vars_by_score:
    if len(seen_vars) == _VAR_LIMIT:
      break
    if v.dcid in seen_vars:
      continue
    seen_vars.add(v.dcid)
    trimmed_vars.append(v.dcid)
  return trimmed_vars


def get_dcids_for_var_strs(merged_var_str_to_grps: Dict[str, List[str]],
                           topic_cache: Dict[str, List[str]]):
  """
  Retrieves DCIDs for a set of variable strings, handling topic-based substitutions and error tracking.

  Args:
    merged_var_str_to_grps (Dict[str, List[str]]): 
      A mapping from variable strings to list of svgs. Each variable string may be associated with multiple groups.
    topic_cache (Dict[str, List[str]]): 
      A cache mapping topic dcids to children topics or statistical variables.

  Returns:
    Tuple[Dict[str, List[str]], List[str]]:
      - A dictionary mapping each input variable string to a list of corresponding DCIDs or topic strings.
      - A list of variable strings for which DCID retrieval failed due to exceptions.
  """
  var_dcids = {}
  errors = []
  for var_str, grps in merged_var_str_to_grps.items():
    grps_to_query = grps + _DEFAULT_SVGS_TO_QUERY
    try:
      var_list = get_var_dcids(var_str, grps_to_query)
    except Exception as e:
      errors.append(var_str)
      print(e)
      continue
    var_topics = list(filter(lambda x: x.startswith(_TOPIC_PREFIX), var_list))
    topic_strs, children_nodes = get_hierarchy_format(var_topics, topic_cache,
                                                      _MAX_TOPICS_DEPTH)
    var_dcids[var_str] = []
    for v in var_list:
      if not v.startswith(_TOPIC_PREFIX) and v in children_nodes:
        continue
      if v in topic_strs:
        for t_string in topic_strs[v]:
          var_dcids[var_str].append(t_string)
      else:
        var_dcids[var_str].append(v)
  return var_dcids, errors


def get_vars(query_info: Dict[str, QueryInfo], topic_cache: Dict[str,
                                                                 List[str]]):
  """
  Retrieves variable DCIDs for each variable string in the provided queries.

  Args:
    query_info (Dict[str, QueryInfo]): A dictionary mapping query identifiers to QueryInfo objects, each containing variable strings and their associated groups.
    topic_cache (Dict[str, List[str]]): A cache mapping topic dcids to their children topics or statistical variables.

  Returns:
    Tuple[List[List[Any]], Any]: 
      - A list of lists, representing csv rows where each inner list (row) contains the query number, query string, variable string, and the corresponding variable DCID.
      - An object representing any errors encountered during variable DCID retrieval.
  """
  merged_var_str_to_grps = get_merged_var_str_dict(
      [qi.var_str_to_grps for qi in query_info.values()])
  var_dcids, errors = get_dcids_for_var_strs(merged_var_str_to_grps,
                                             topic_cache)

  results = []
  for q in list(query_info.values()):
    for var_str in q.var_str_to_grps.keys():
      curr_sv_results = var_dcids.get(var_str)
      if curr_sv_results:
        results.extend(
            [[q.query_num, q.query_str, var_str, sv] for sv in curr_sv_results])
      else:
        results.extend([q.query_num, q.query_str, var_str, ''])
  return results, errors


def main(_):
  query_sets = get_queries(FLAGS.input_folder)
  topic_cache = get_topic_cache(FLAGS.topic_cache)
  for qs in query_sets:
    print(f'generating results for {qs.filename}')
    var_results, errors = get_vars(qs.query_info, topic_cache)
    with open(f'{FLAGS.output_folder}/{qs.filename}_vars.csv', 'w') as f:
      writer = csv.writer(f)
      writer.writerows(var_results)
    with open(f'{FLAGS.output_folder}/{qs.filename}_errors.txt', 'w') as f:
      f.write(json.dumps(errors))
    print(f'finished generating results for {qs.filename}')


if __name__ == "__main__":
  app.run(main)
