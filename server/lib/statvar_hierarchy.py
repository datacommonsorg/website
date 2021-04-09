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

import services.datacommons as dc


def updateIndex(token_string, index, node_id):
    """updates the index with the tokens for a node
    
    Args:
        token_string = list of tokens for node of interest separated by space
        index = the current dict of token to set of stat var ids and stat var 
            group ids
        node_id = id of the current node
    """
    token_string = token_string.lower()
    token_string = token_string.replace(",", "")
    token_list = token_string.split(" ")
    for token in token_list:
        if token not in index:
            index[token] = set()
        index[token].add(node_id)


def getStatVarSearchIndex():
    """Returns a dict of token to set of stat var ids and stat var group ids
    """
    svg_map = dc.get_statvar_groups("")
    index = {}
    for svg_id, svg in svg_map.items():
        token_string = svg.get("absoluteName", "")
        updateIndex(token_string, index, svg_id)
        for childStatVar in svg.get("childStatVars", []):
            token_string = childStatVar.get("searchName", "")
            updateIndex(token_string, index, childStatVar["id"])
    return index
