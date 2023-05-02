# Copyright 2023 Google LLC
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
"""Node data endpoints."""

import json

import flask
from flask import request
from flask import Response

from server.lib import fetch

bp = flask.Blueprint('api_node', __name__, url_prefix='/api/node')


@bp.route('/triples/<path:direction>/<path:dcid>')
def triples(direction, dcid):
  """Returns all the triples given a node dcid."""
  if direction != 'in' and direction != 'out':
    return "Invalid direction provided, please use 'in' or 'out'", 400
  return fetch.triples([dcid], direction == 'out').get(dcid, {})


@bp.route('/propvals/<path:direction>', methods=['GET', 'POST'])
def get_property_value(direction):
  """Returns the property values for given node dcids and property label."""
  if direction != "in" and direction != "out":
    return "Invalid direction provided, please use 'in' or 'out'", 400
  dcids = request.args.getlist('dcids')
  if not dcids:
    dcids = request.json['dcids']
  prop = request.args.get('prop')
  if not prop:
    prop = request.json['prop']
  response = fetch.raw_property_values(dcids, prop, direction == 'out')
  return Response(json.dumps(response), 200, mimetype='application/json')
