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

import json

from flask import Blueprint
from flask import current_app
from flask import request
from flask import Response

from server.lib import fetch
from server.lib import shared
from server.lib.cache import cache
from server.routes import TIMEOUT
import server.services.datacommons as dc

# TODO(shifucun): add unittest for this module

# Define blueprint
bp = Blueprint("stats", __name__, url_prefix='/api/stats')


@bp.route('/stat-var-property')
def stat_var_property():
  """Handler to get the properties of give statistical variables.

  Returns:
      A dictionary keyed by stats var dcid with value being a dictionary of
      all the properties of each stats var.
  """
  dcids = request.args.getlist('dcids')
  ranked_statvars = current_app.config['RANKED_STAT_VARS']
  result = {}
  resp = fetch.triples(dcids)
  # Get all the constraint properties
  for dcid, arcs in resp.items():
    pvs = {}
    for pred, nodes in arcs.items():
      if pred == 'constraintProperties':
        for node in nodes:
          pvs[node['dcid']] = ''
    pt = ''
    md = ''
    mprop = ''
    st = ''
    mq = ''
    name = dcid
    for pred, nodes in arcs.items():
      objId = nodes[0].get('dcid', '')
      objVal = nodes[0].get('value', '')
      if pred == 'measuredProperty':
        mprop = objId
      if pred == 'populationType':
        pt = objId
      if pred == 'measurementDenominator':
        md = objId
      if pred == 'statType':
        st = objId
      if pred == 'name':
        name = objVal
      if pred == 'measurementQualifier':
        mq = objId
      if pred in pvs:
        pvs[pred] = objId if objId else objVal

    result[dcid] = {
        'mprop':
            mprop,
        'pt':
            pt,
        'md':
            md,
        'st':
            st,
        'mq':
            mq,
        'pvs':
            pvs,
        'title':
            name,
        'ranked':
            dcid in ranked_statvars,
        'pcAllowed':
            current_app.config['ENABLE_PER_CAPITA'] and
            shared.is_percapita_relevant(dcid, current_app.config['NOPC_VARS'])
    }
  return result


@bp.route('/stat-var-search', methods=('GET', 'POST'))
@cache.cached(timeout=TIMEOUT, query_string=True)
def search_statvar():
  """Gets the statvars and statvar groups that match the tokens in the query."""
  if request.method == 'GET':
    query = request.args.get("query")
    places = request.args.getlist("places")
    sv_only = request.args.get("svOnly", False)
  else:  # Method is POST
    query = request.json.get("query")
    places = request.json.get("places")
    sv_only = request.json.get("svOnly")
  result = dc.search_statvar(query, places, sv_only)
  return Response(json.dumps(result), 200, mimetype='application/json')
