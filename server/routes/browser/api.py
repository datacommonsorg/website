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

import json

import flask
from flask import request
from flask import Response

from server.lib import fetch
from server.lib.cache import cache
from server.routes import TIMEOUT
import server.services.datacommons as dc

bp = flask.Blueprint('api_browser', __name__, url_prefix='/api/browser')


@bp.route('/provenance')
@cache.cached(timeout=TIMEOUT, query_string=True)
def provenance():
  """Returns all the provenance information."""
  prov_resp = fetch.property_values(['Provenance'], 'typeOf', False)
  url_resp = fetch.property_values(prov_resp['Provenance'], "url", True)
  result = {}
  for dcid, urls in url_resp.items():
    if len(urls) > 0:
      result[dcid] = urls[0]
  return result
