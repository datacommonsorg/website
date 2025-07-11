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
import os
from typing import Dict, List, Set, Tuple

from absl import app
from absl import flags
import requests

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
class QueryInfo:
  query_num: str
  query_str: str
  # the variable part of the query and the list of variable groups that the
  # variable should belong to
  var_str_to_grps: Dict[str, Set[str]]


@dataclass
class QuerySet:
  filename: str
  query_info: Dict[str, QueryInfo]


@dataclass
class VarInfo:
  dcid: str
  score: str


def get_queries(input_folder) -> List[QuerySet]:
  """
    Parses all CSV files in the specified input folder and constructs a list of QuerySet objects.

    Each CSV file is expected to contain rows with the following columns:
      - 'query_num': Identifier for the query.
      - 'query': The query string.
      - 'var_string': A variable string associated with the query.
      - 'groups': A comma-separated list of group names.

    Args:
      input_folder (str): Path to the folder containing input CSV files.

    Returns:
      List[QuerySet]: A list of QuerySet objects, one for each CSV file in the input folder.
    """
  results = []
  for filename in os.listdir(input_folder):
    with open(f'{input_folder}/{filename}', 'r') as f:
      filename_no_ext = filename.split('.')[0]
      reader = csv.DictReader(f)
      query_info: Dict[str, QueryInfo] = {}
      for row in reader:
        query_num = row.get('query_num', '')
        query_str = row.get('query')
        var_string = row.get('var_string').strip()
        groups = filter(lambda x: x != '', row.get('groups').strip().split(','))
        if not query_num in query_info:
          query_info[query_num] = QueryInfo(query_num, query_str, {})
        if not var_string in query_info[query_num].var_str_to_grps:
          query_info[query_num].var_str_to_grps[var_string] = set()
        query_info[query_num].var_str_to_grps[var_string].update(groups)
      results.append(QuerySet(filename_no_ext, query_info))
  return results


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


def get_topic_strings(
    var_list: List[str],
    topic_cache: Dict[str, List[str]]) -> Tuple[Dict[str, List[str]], Set[str]]:
  """
  Processes a list of variable names to extract and format topic strings, and identifies statistical variables (SVs) included in the topics.

  Args:
    var_list (List[str]): A list of variable dcids, some of which may represent topics (identified by a specific prefix).
    topic_cache (Dict[str, List[str]]): A mapping from topic dcid to their child topics or SVs.

  Returns:
    Tuple[Dict[str, List[str]], Set[str]]:
      - A dictionary mapping each top-level topic to a list of formatted topic strings, excluding topics that are nested within others.
      - A set of SVs (statistical variables) that are included as children of topics
  """
  var_topics = list(filter(lambda x: x.startswith(_TOPIC_PREFIX), var_list))
  topic_strs: Dict[str, List[str]] = {}
  topic_svs: Set[str] = set()
  # list of top level topics to remove because they are found within another topic
  top_level_topics_to_remove: Set[str] = set()
  for topic in var_topics:
    topic_strs[topic] = []
    next_nodes = [(0, topic)]
    while next_nodes:
      curr_lvl, curr_node = next_nodes.pop()
      if curr_lvl > _MAX_TOPICS_DEPTH:
        continue
      if curr_lvl > 0:
        top_level_topics_to_remove.add(curr_node)
      curr_node_str = ''
      for _ in range(curr_lvl):
        curr_node_str += '-->'
      curr_node_str += curr_node
      topic_strs[topic].append(curr_node_str)
      # if the node is not found in the topic cache, assume it is a sv
      if not topic_cache.get(curr_node):
        topic_svs.add(curr_node)
      next_nodes.extend([
          (curr_lvl + 1, n) for n in topic_cache.get(curr_node, [])
      ])
  # remove top level topics that are found within other topics
  filtered_topic_strs = {
      k: v for k, v in topic_strs.items() if k not in top_level_topics_to_remove
  }
  return filtered_topic_strs, topic_svs


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


def get_merged_var_str_to_grps(
    query_info: List[QueryInfo]) -> Dict[str, Set[str]]:
  """
  Merges the `var_str_to_grps` mappings from a list of `QueryInfo` objects into a single dictionary.

  For each variable string (`var_str`) found in any `QueryInfo`'s `var_str_to_grps`, collects all associated group names into a set, ensuring that each group is only listed once per variable string.

  Args:
    query_info (List[QueryInfo]): A list of `QueryInfo` objects, each containing a `var_str_to_grps` mapping.

  Returns:
    Dict[str, Set[str]]: A dictionary mapping each variable string to a set of all group names associated with it across all provided `QueryInfo` objects.
  """
  merged_var_str_to_grps = {}
  for qi in query_info:
    for var_str, grps in qi.var_str_to_grps.items():
      if not var_str in merged_var_str_to_grps:
        merged_var_str_to_grps[var_str] = set()
      merged_var_str_to_grps[var_str].update(grps)
  return merged_var_str_to_grps


def get_dcids_for_var_strs(merged_var_str_to_grps: Dict[str, Set[str]],
                           topic_cache: Dict[str, List[str]]):
  """
  Retrieves DCIDs for a set of variable strings, handling topic-based substitutions and error tracking.

  Args:
    merged_var_str_to_grps (Dict[str, Set[str]]): 
      A mapping from variable strings to sets of svgs. Each variable string may be associated with multiple groups.
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
    grps_to_query = list(grps) + _DEFAULT_SVGS_TO_QUERY
    try:
      var_list = get_var_dcids(var_str, grps_to_query)
    except Exception as e:
      errors.append(var_str)
      print(e)
      continue
    topic_strings, svs_in_topics = get_topic_strings(var_list, topic_cache)
    var_dcids[var_str] = []
    for v in var_list:
      if v in svs_in_topics:
        continue
      if v in topic_strings:
        for t_string in topic_strings[v]:
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
  merged_var_str_to_grps = get_merged_var_str_to_grps(list(query_info.values()))
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
