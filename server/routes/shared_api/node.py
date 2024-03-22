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
import re

import flask
from flask import request
from flask import Response

from server.lib import fetch

bp = flask.Blueprint('api_node', __name__, url_prefix='/api/node')

# Regex for a relation expression for a property
# https://docs.datacommons.org/api/rest/v2#relation-expressions
_PROPERTY_EXPRESSION_RE = r'(->|<-)([a-zA-Z]+)({[a-zA-Z]+:[a-zA-Z]+})*'
_OUT_ARROW = '->'


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


@bp.route('/propvals', methods=['GET', 'POST'])
def expression_property_value():
  """
  Returns the property values for given node dcids and a relation expression for
  a property (https://docs.datacommons.org/api/rest/v2#relation-expressions)
  """
  dcids = request.args.getlist('dcids')
  if not dcids and request.json:
    dcids = request.json['dcids']
  prop_expression = request.args.get('propExpr')
  if not prop_expression and request.json:
    prop_expression = request.json['propExpr']
  if not dcids:
    return 'error: must provide a `dcids` field', 400
  if not prop_expression:
    return 'error: must provide a `propExpr` field', 400
  response = get_property_value_from_expression(dcids, prop_expression)
  return Response(json.dumps(response), 200, mimetype='application/json')


def _get_data_for_pv_expression(dcids, expression):
  """
  Gets the data for a property value expression.

  Args:
    dcids: list of dcids to get the property values for
    expression: the expression that specifies what property(s) to get values for

  Returns:
    results: map of dcid to values
    curr2orig_dcids: map of dcids to the original dcid passed to the function
        that the dcid stemmed from.
  """

  # Get a list of single property relation expressions (the expression passed to
  # this function can chain multiple relation expressions)
  expression_matches = re.finditer(_PROPERTY_EXPRESSION_RE, expression)
  # result of the last round of fetching property values
  results = {}
  # the list of dcids to use to fetch the next round of property values
  curr_dcids = dcids
  # map of dcids to the original dcid passed to this function that it stemmed
  # from.
  curr2orig_dcids = {dcid: dcid for dcid in curr_dcids}
  for match in expression_matches:
    direction, prop, constraints = match.groups()
    results = fetch.raw_property_values(curr_dcids,
                                             prop,
                                             out=direction == _OUT_ARROW,
                                             constraints=constraints or '')
    curr_dcids = []
    for dcid in results.keys():
      # Get the original node dcid these values should apply to
      orig_dcid = curr2orig_dcids[dcid]
      # for each value that has a dcid, add it to curr_dcids for next round of
      # property value fetching
      for val in results.get(dcid, []):
        val_dcid = val.get('dcid', '')
        if not val_dcid:
          continue
        curr_dcids.append(val_dcid)
        curr2orig_dcids[val_dcid] = orig_dcid
  return results, curr2orig_dcids


def get_property_value_from_expression(dcids, expression):
  """
  Returns the property values for given node dcids and a relation expression for
  a property (https://docs.datacommons.org/api/rest/v2#relation-expressions)
  """
  data, dcid2original = _get_data_for_pv_expression(dcids, expression)
  result = {}
  for dcid in sorted(data.keys()):
    result_dcid = dcid2original.get(dcid)
    if not result_dcid:
      continue
    if not result_dcid in result:
      result[result_dcid] = []
    result[result_dcid].extend(data[dcid])
  return result
