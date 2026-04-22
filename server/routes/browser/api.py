# Copyright 2020 Google LLC
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
"""Knowledge Graph related handlers."""
import flask
from flask import jsonify

from server.lib import fetch
from server.lib.cache import cache
from server.routes import TIMEOUT

bp = flask.Blueprint('api_browser', __name__, url_prefix='/api/browser')


@bp.route('/provenance')
@cache.cached(timeout=TIMEOUT, query_string=True)
def provenance():
  """Return provenance name for all available data sources."""
  prov_resp = fetch.property_values(['Provenance'], 'typeOf', False)
  prov_dcids = prov_resp.get('Provenance', [])

  if not prov_dcids:
    return jsonify({})

  properties_to_fetch = ['name']
  prop_resp = fetch.multiple_property_values(prov_dcids, properties_to_fetch,
                                             True)

  result = {}
  for dcid, props in prop_resp.items():
    names = props.get('name', [])

    result[dcid] = {'name': names[0] if names else dcid}

  return jsonify(result)
