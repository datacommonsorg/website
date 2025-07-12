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
import os
from typing import Dict, List, Set, Tuple

_HIERARCHY_PREFIX = '-->'


@dataclass
class QueryInfo:
  query_num: str
  query_str: str
  # the variable part of the query and the list of variable groups that the
  # variable should belong to
  var_str_to_grps: Dict[str, List[str]]
  # the variable part of the query and the list of variables dcids that match
  var_str_to_vars: Dict[str, List[str]]


@dataclass
class QuerySet:
  filename: str
  query_info: Dict[str, QueryInfo]


def get_queries(input_folder) -> List[QuerySet]:
  """
    Parses all CSV files in the specified input folder and constructs a list of QuerySet objects.

    Each CSV file is expected to contain rows with the following columns:
      - 'query_num': Identifier for the query.
      - 'query': The query string.
      - 'var_string': A variable string associated with the query.
      - 'groups' [Optional]: A comma-separated list of group names.
      - 'var' [Optional]: variable dcid with optional '-->' prefix that matches the variable string.

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
        if not query_num in query_info:
          query_info[query_num] = QueryInfo(query_num, query_str, {}, {})
        var_string = row.get('var_string').strip()
        # Add groups associated with the variable string
        groups = filter(lambda x: x != '',
                        row.get('groups', '').strip().split(','))
        if not var_string in query_info[query_num].var_str_to_grps:
          query_info[query_num].var_str_to_grps[var_string] = []
        query_info[query_num].var_str_to_grps[var_string].extend(groups)
        # Add variables associated with the variable string
        var_dcid = row.get('var', '').strip().replace('-->', '')
        if not var_string in query_info[query_num].var_str_to_vars:
          query_info[query_num].var_str_to_vars[var_string] = []
        query_info[query_num].var_str_to_vars[var_string].append(var_dcid)
      results.append(QuerySet(filename_no_ext, query_info))
  return results


def get_merged_var_str_dict(
    var_str_dicts: List[Dict[str, List[str]]]) -> Dict[str, List[str]]:
  """
  Merges a list of dictionaries where each dictionary maps variable strings to a list of associated values.
  
  Args:
    dicts (List[Dict[str, List[str]]]): A list of dictionaries to merge.
  
  Returns:
    Dict[str, List[str]]: A single dictionary with merged variable strings and a deduplicated list of associated values.
  """
  merged_var_str_dict = {}
  seen_vals = {}
  for d in var_str_dicts:
    for var_str, vals in d.items():
      if not var_str in merged_var_str_dict:
        merged_var_str_dict[var_str] = []
      merged_var_str_dict[var_str].extend(
          [v for v in vals if v not in seen_vals.get(var_str, set())])
      if not var_str in seen_vals:
        seen_vals[var_str] = set()
      seen_vals[var_str].update(vals)
  return merged_var_str_dict


def get_hierarchy_format(
    starting_nodes: List[str], children: Dict[str, Set[str]],
    max_depth: int) -> Tuple[Dict[str, List[str]], Set[str]]:
  """
  Generates a hierarchical string representation for nodes and their children up to a specified depth.

   Args:
      starting_nodes (List[str]): List of root node dcids to start the hierarchy from.
      children (Dict[str, Set[str]]): Mapping from node dcids to their respective sets of child node dcids.
      max_depth (int): Maximum depth to traverse in the hierarchy.

   Returns:
      Tuple[Dict[str, List[str]], Set[str]]:
          - A dictionary mapping each root node (that is not a child of any other node) to a list of its formatted hierarchical strings.
          - A set containing all nodes that are children of other nodes in the hierarchy.
  """
  node_to_formatted_strs = {}
  children_nodes = set()
  for node in starting_nodes:
    node_to_formatted_strs[node] = []
    next_nodes = [(0, node)]
    while next_nodes:
      curr_lvl, curr_node = next_nodes.pop()
      if curr_lvl > max_depth:
        continue
      if curr_lvl > 0:
        children_nodes.add(curr_node)
      curr_node_str = ''
      for _ in range(curr_lvl):
        curr_node_str += _HIERARCHY_PREFIX
      curr_node_str += curr_node
      node_to_formatted_strs[node].append(curr_node_str)
      next_nodes.extend([(curr_lvl + 1, n) for n in children.get(curr_node, [])
                        ])
  filtered_node_strings = {
      k: v for k, v in node_to_formatted_strs.items() if k not in children_nodes
  }
  return filtered_node_strings, children_nodes
