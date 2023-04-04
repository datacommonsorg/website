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

BLOCKLISTED_STAT_VAR_GROUPS = {"dc/g/Uncategorized"}


@bp.route('/info', methods=['GET', 'POST'])
def get_variable_group_info():
  """Gets the stat var group node information.

  This is to retrieve the adjacent nodes, including child stat vars, child stat
  var groups and parent stat var groups for the given stat var group node.
  """
  if request.method == 'GET':
    dcid = request.args.get("dcid")
    entities = request.args.getlist("entities")
    numEntitiesExistence = request.args.get("numEntitiesExistence", 1)
  else:
    dcid = request.json.get("dcid")
    entities = request.json.get("entities")
    numEntitiesExistence = request.json.get("numEntitiesExistence", 1)
  resp = dc.get_variable_group_info([dcid], entities, numEntitiesExistence)
  result = resp.get("data", [{}])[0].get("info", {})
  if current_app.config["ENABLE_BLOCKLIST"]:
    childSVG = result.get("childStatVarGroups", [])
    filteredChildSVG = []
    for svg in childSVG:
      svg_id = svg.get("id", "")
      if svg_id in BLOCKLISTED_STAT_VAR_GROUPS:
        continue
      filteredChildSVG.append(svg)
    result["childStatVarGroups"] = filteredChildSVG
  return result
