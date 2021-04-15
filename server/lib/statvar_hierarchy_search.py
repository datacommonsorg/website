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

# Contains functions for building and using the search index for stat var
# hierarchy based off all stat vars and stat var groups in our knowledge graph.
# The search index should be built on Flask server initialization and saved in
# the app config with the key "STAT_VAR_SEARCH_INDEX", and during search, it can
# be accessed with current_app.config['STAT_VAR_SEARCH_INDEX'] to get the
# results for each token in the search query.
#
# The index will be a dictionary of token to dictionary of ids (of stat vars and
# stat var groups) to ranking information (approxNumPv and rankingName).
#
# format of index:
# {
#   person: {
#     count_person_female: {
#         approxNumPv: 3,
#         rankingName: Count Person Female
#     },
#     dc/g/count_person: {
#         approxNumPv: 2,
#         rankingName: Count of Person
#     },
#     ...
#  },
#  ...
# }
#
# In the context of this module, a node will be either a stat var or stat var
# group object. A stat var object has searchName, displayName, and id. A stat
# var group object has an absoluteName, optional childStatVarGroups, and
# optional childStatVars

import services.datacommons as dc
from cache import cache
from flask import current_app

# we want non human curated stat vars to be ranked last, so set their number of
# PVs to a number greater than max number of PVs for a human curated stat var.
NON_HUMAN_CURATED_NUM_PV = 20


def update_index(token_string, index, node_id, node):
    """updates the index with the tokens for a node
    
    Args:
        token_string: list of tokens for node of interest separated by space
        index: dictionary mapping token to set of stat var ids and stat var 
            group ids
        node_id: id of the current node
        node: the node of interest
    """
    token_string = token_string.lower()
    # remove commas in the token string because there could be strings like
    # "age, gender" that should produce the tokens "age" and "gender"
    token_string = token_string.replace(",", "")
    token_list = token_string.split()
    node_ranking_data = {}
    approx_num_pv = len(node_id.split("_"))
    if approx_num_pv == 1:
        node_ranking_data["approxNumPv"] = NON_HUMAN_CURATED_NUM_PV
    else:
        node_ranking_data["approxNumPv"] = approx_num_pv
    node_ranking_data["rankingName"] = node.get("searchName",
                                                node.get("absoluteName"))
    for token in token_list:
        if token not in index:
            index[token] = {}
        index[token][node_id] = node_ranking_data


def get_statvar_search_index():
    """Returns a dict of token to dict of ids (of stat vars and stat var groups)
    to ranking information (which has approxNumPv and rankingName).

    example: 
    person: {
        count_person_female: {
            approxNumPv: 3,
            rankingName: Count Person Female
        },
        dc/g/count_person: {
            approxNumPv: 2,
            rankingName: Count of Person
        },
        ...
    },
    ... 
    """
    svg_map = dc.get_statvar_groups("")
    index = {}
    for svg_id, svg in svg_map.items():
        token_string = svg.get("absoluteName", "")
        update_index(token_string, index, svg_id, svg)
        for childStatVar in svg.get("childStatVars", []):
            token_string = childStatVar.get("searchName", "")
            update_index(token_string, index, childStatVar["id"], childStatVar)
    return index


def rank_search_result(token_result_ids, token_result_nodes):
    """ Sorts the results by approxNumPv and rankingName

    Args: 
        token_result_ids: list of ids
        token_result_nodes: dictionary mapping id to node
    """
    sorted_result = sorted(token_result_ids, key=len)
    sorted_result.sort(key=lambda result: token_result_nodes.get(result, {}).
                       get("approxNumPv"))
    return sorted_result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_search_result(tokens):
    """gets the sorted list of results that matches all the tokens in the
    token_string
    
    Args:
        tokens: list of tokens 
    
    Returns:
        set of values that matches all the tokens in the token_string
    """
    search_index = current_app.config['STAT_VAR_SEARCH_INDEX']
    token_result_ids = {}
    token_result_nodes = {}
    if len(tokens) > 0:
        token_result_nodes = search_index.get(tokens[0], {})
        token_result_ids = set(token_result_nodes.keys())
    for token in tokens[1:]:
        curr_token_result = search_index.get(token, {})
        curr_token_ids = set(curr_token_result.keys())
        token_result_ids = token_result_ids.intersection(curr_token_ids)
        token_result_nodes.update(curr_token_result)
    sorted_result = rank_search_result(token_result_ids, token_result_nodes)
    return sorted_result
