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
"""Node data endpoints."""

import json

import flask

import server.services.datacommons as dc

bp = flask.Blueprint('api.node', __name__, url_prefix='/api/node')


@bp.route('/properties/<path:direction>/<path:dcid>')
def get_properties(dcid, direction):
  """Returns all properties given a node dcid."""
  return json.dumps(dc.properties(dcid, direction))


@bp.route('/triples/<path:direction>/<path:dcid>')
def triples(direction, dcid):
  """Returns all the triples given a node dcid."""
  if direction != "in" and direction != "out":
    return "Invalid direction provided, please use 'in' or 'out'", 400
  return dc.triples(dcid, direction).get("triples", {})
