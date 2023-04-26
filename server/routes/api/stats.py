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

from server.cache import cache
import server.services.datacommons as dc

# TODO(shifucun): add unittest for this module

# Define blueprint
bp = Blueprint("stats", __name__, url_prefix='/api/stats')


@bp.route('/stats-var-property')
def stats_var_property():
  """Handler to get the properties of give statistical variables.

  Returns:
      A dictionary keyed by stats var dcid with value being a dictionary of
      all the properties of each stats var.
  """
  dcids = request.args.getlist('dcid')
  result = stats_var_property_wrapper(dcids)
  return Response(json.dumps(result), 200, mimetype='application/json')


def stats_var_property_wrapper(dcids):
  """Function to get properties for given statistical variables."""
  data = dc.fetch_data('/node/triples', {
      'dcids': dcids,
  },
                       compress=False,
                       post=True)
  ranked_statvars = current_app.config['RANKED_STAT_VARS']
  result = {}
  # Get all the constraint properties
  for dcid, triples in data.items():
    pvs = {}
    for triple in triples:
      if triple['predicate'] == 'constraintProperties':
        pvs[triple["objectId"]] = ''
    pt = ''
    md = ''
    mprop = ''
    st = ''
    mq = ''
    name = dcid
    for triple in triples:
      predicate = triple['predicate']
      objId = triple.get('objectId', '')
      objVal = triple.get('objectValue', '')
      if predicate == 'measuredProperty':
        mprop = objId
      if predicate == 'populationType':
        pt = objId
      if predicate == 'measurementDenominator':
        md = objId
      if predicate == 'statType':
        st = objId
      if predicate == 'name':
        name = objVal
      if predicate == 'measurementQualifier':
        mq = objId
      if predicate in pvs:
        pvs[predicate] = objId if objId else objVal

    result[dcid] = {
        'mprop': mprop,
        'pt': pt,
        'md': md,
        'st': st,
        'mq': mq,
        'pvs': pvs,
        'title': name,
        'ranked': dcid in ranked_statvars
    }
  return result


@bp.route('/stat-var-search')
@cache.cached(timeout=3600 * 24, query_string=True)
def search_statvar():
  """Gets the statvars and statvar groups that match the tokens in the query."""
  query = request.args.get("query")
  places = request.args.getlist("places")
  sv_only = request.args.get("svOnly", False)
  result = dc.search_statvar(query, places, sv_only)
  return Response(json.dumps(result), 200, mimetype='application/json')
