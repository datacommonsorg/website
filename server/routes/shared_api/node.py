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
from dataclasses import dataclass
import json
import re
from typing import List

import flask
from flask import request
from flask import Response

from server.lib import fetch

bp = flask.Blueprint('api_node', __name__, url_prefix='/api/node')

# Regex for a relation expression for a property
# https://docs.datacommons.org/api/rest/v2#relation-expressions
_PROPERTY_EXPRESSION_RE = r'(->|<-)(\w+)({\w+:\w+})*'
_OUT_ARROW = '->'


@dataclass
class PropertySpec:
  # name of the property to get values for
  prop: str
  # whether we are looking for the out arcs or not
  out: bool
  # constraints on the values we get
  constraints: str


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


def parse_property_expression(expression: str) -> List[PropertySpec]:
  """
  Takes a pv expression and parses it into a list of property specs. The
  expression may chain multiple properties, while each property spec defines a
  single property to get values for.
  """
  expression_matches = re.finditer(_PROPERTY_EXPRESSION_RE, expression)
  result = []
  for match in expression_matches:
    direction, prop, constraints = match.groups()
    result.append(
        PropertySpec(prop=prop,
                     out=direction == _OUT_ARROW,
                     constraints=constraints or ''))
  return result


def _get_values_for_property_list(dcids: List[str], props: List[PropertySpec]):
  """
  Recursive function to get the values for a list of chained properties for a
  list of dcids. 

  Args:
    dcids: list of dcids to get the property values for
    props: list of chained property values

  Returns:
    map of dcid to final list of values from the chain of props
  """

  if len(props) == 0:
    return {}

  # Get the result for the first prop in the prop list and return that result if
  # that's the only prop in the list.
  first_prop_result = fetch.raw_property_values(dcids, props[0].prop,
                                                props[0].out,
                                                props[0].constraints)
  if len(props) == 1:
    return first_prop_result

  # Get the results for the remaining props in the prop list
  next_dcids = set()
  for vals in first_prop_result.values():
    next_dcids.update([v['dcid'] for v in vals if 'dcid' in v])
  remaining_prop_results = _get_values_for_property_list(
      sorted(list(next_dcids)), props[1:])

  # Generate results by mapping the results for the remaining props to their
  # original dcids
  result = {}
  for dcid, values in first_prop_result.items():
    # For each value in this result, get the values for the remaining props
    result_values = []
    for val in values:
      val_dcid = val.get('dcid', '')
      result_values.extend(remaining_prop_results.get(val_dcid, []))
    result[dcid] = result_values
  return result


def get_property_value_from_expression(dcids, expression):
  """
  Returns the property values for given node dcids and a chain of property
  relation expressions (https://docs.datacommons.org/api/rest/v2#relation-expressions)
  """
  prop_specs = parse_property_expression(expression)
  return _get_values_for_property_list(dcids, prop_specs)


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
