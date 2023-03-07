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
"""Disease browser related handlers."""

import json

import flask
from flask import Response

from server.cache import cache
import server.services.datacommons as dc_service

bp = flask.Blueprint('api.disease', __name__, url_prefix='/api/disease')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/<path:dcid>')
def get_node(dcid):
  """Returns data given a disease node."""
  response = dc_service.fetch_data('/internal/bio', {
      'dcid': dcid,
  },
                                   compress=False,
                                   post=False,
                                   has_payload=False)
  return response


@bp.route('/diseaseParent/<path:dcid>')
def get_disease_parent(dcid):
  """Returns parent node for given a disease node."""
  list_dcid = []  ## list to store disease dcids
  list_name = []  ## list to store disease names
  final_dcid = dcid
  while (final_dcid != "bio/DOID_4"
        ):  ## dcid of the biggest parent node where iteration stops
    node_dcids = dc_service.property_values([final_dcid],
                                            "specializationOf").get(
                                                final_dcid, [])
    if not node_dcids:
      break
    node_dcid = node_dcids[0]
    node_names = dc_service.property_values([node_dcid],
                                            "name").get(node_dcid, [])
    node_name = node_dcid
    if node_names:
      node_name = node_names[0]
    list_dcid.append(node_dcid)
    list_name.append(node_name)
    final_dcid = node_dcid
  result = [list_dcid, list_name]  ## return a list of dcid and name lists
  return Response(json.dumps(result), 200, mimetype='application/json')
