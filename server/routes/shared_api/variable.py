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

import json

from flask import Blueprint
from flask import request
from markupsafe import escape

import logging
import server.services.datacommons as dc
from server.lib import fetch

bp = Blueprint("variable", __name__, url_prefix='/api/variable')


@bp.route('/path')
def get_variable_path():
  """Gets the path of a stat var to the root of the stat var hierarchy."""
  curr = escape(request.args.get("dcid"))
  result = [curr]
  prop = 'memberOf'
  while True:
    parents = fetch.property_values([curr], prop).get(curr, [])
    logging.info(parents)
    if not parents:
      break
    curr = parents[0]
    if len(parents) > 1:
      for parent in parents:
        if 'dc/g/Custom_' in parent:
          curr = parent
          break
    if curr == 'dc/g/Root':
      break
    result.append(curr)
    prop = 'specializationOf'
  return json.dumps(result), 200


@bp.route('/info')
def variable_info():
  """Gets the info of a list of stat var."""
  dcids = request.args.getlist("dcids")
  data = dc.variable_info(dcids).get("data", [])
  result = {}
  for item in data:
    if "info" in item and "node" in item:
      result[item["node"]] = item["info"]
  return result
