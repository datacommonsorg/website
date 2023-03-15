# Copyright 2022 Google LLC
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

from flask import Blueprint
from flask import current_app
from flask import request

import server.services.datacommons as dc

bp = Blueprint("variable-group", __name__, url_prefix='/api/variable-group')

# Temporary fix for messy svgs. Remove once svgs have been fixed. SVGs that are
# blocklisted here must be part of either blocklistedSvgIds or miscellaneousSvgIds
# in the mixer file /internal/server/statvar/statvar_hierarchy_util.go
BLOCKLISTED_STAT_VAR_GROUPS = {
    "dc/g/Establishment_Industry", "dc/g/Uncategorized"
}
UPDATE_NUM_DESCENDENTS_SVG = {"dc/g/Establishment", "dc/g/Employment"}
NUM_DESCENDENTS_TO_SUBTRACT = 12123


@bp.route('/info')
def get_variable_group_info():
  """Gets the stat var group node information.

  This is to retrieve the adjacent nodes, including child stat vars, child stat
  var groups and parent stat var groups for the given stat var group node.
  """
  dcid = request.args.get("dcid")
  entities = request.args.getlist("entities")
  numEntitiesExistence = request.args.get("numEntitiesExistence", 1)
  resp = dc.get_variable_group_info([dcid], entities, numEntitiesExistence)
  result = resp.get("data", [{}])[0].get("info", {})
  if current_app.config["ENABLE_BLOCKLIST"]:
    childSVG = result.get("childStatVarGroups", [])
    filteredChildSVG = []
    for svg in childSVG:
      svg_id = svg.get("id", "")
      if svg_id in BLOCKLISTED_STAT_VAR_GROUPS:
        continue
      svg_num_descendents = svg.get("descendentStatVarCount", 0)
      if svg_id in UPDATE_NUM_DESCENDENTS_SVG and svg_num_descendents > NUM_DESCENDENTS_TO_SUBTRACT:
        svg["descendentStatVarCount"] = svg_num_descendents - NUM_DESCENDENTS_TO_SUBTRACT
      filteredChildSVG.append(svg)
    result["childStatVarGroups"] = filteredChildSVG
  return result
