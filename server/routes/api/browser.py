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
"""Graph browser related handlers."""

import flask
import json

from cache import cache
import services.datacommons as dc
from services.datacommons import fetch_data
from flask import Response
from flask import request

bp = flask.Blueprint('api.browser', __name__, url_prefix='/api/browser')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/triples/<path:dcid>')
def triple_api(dcid):
    """Returns all the triples given a node dcid."""
    return json.dumps(dc.get_triples([dcid]).get(dcid, []))


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/popobs/<path:dcid>')
def popobs_api(dcid):
    """Returns all the triples given a node dcid."""
    return dc.get_pop_obs(dcid)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/propvals/<path:prop>/<path:dcid>')
def get_property_value(dcid, prop):
    """Returns the property values for a given node dcid and property label."""
    response = fetch_data('/node/property-values', {
        'dcids': [dcid],
        'property': prop,
    },
                          compress=False,
                          post=False)
    result = {}
    result["property"] = prop
    result["values"] = response.get(dcid, {})
    return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/proplabels/<path:dcid>')
def get_property_labels(dcid):
    """Returns all property labels given a node dcid."""
    labels = dc.get_property_labels([dcid]).get(dcid, {})
    return Response(json.dumps(labels), 200, mimetype='application/json')


@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
@bp.route('/observationId')
def get_observation_id():
    """Returns the dcid of the observation node for a combination of predicates: observedNodeLocation,
    statisticalVariable, observationDate, measurementMethod (optional), observationPeriod (optional)"""
    place_id = request.args.get("place")
    if not place_id:
        return Response(json.dumps("error: must provide a placeId field"),
                        400,
                        mimetype='application/json')
    stat_var_id = request.args.get("stat_var")
    if not stat_var_id:
        return Response(json.dumps("error: must provide a statVarId field"),
                        400,
                        mimetype='application/json')
    date = request.args.get("date")
    if not date:
        return Response(json.dumps("error: must provide a date field"),
                        400,
                        mimetype='application/json')
    measurement_method = request.args.get("measurement_method", "")
    observation_period = request.args.get("obs_period", "")
    measurement_method_line = ""
    if measurement_method:
        measurement_method_line = "?observation measurementMethod " + measurement_method + " ."
    observation_period_line = ""
    if observation_period:
        observation_period_line = "?observation observationPeriod " + observation_period + " ."
    sparql_query = '''
        SELECT ?dcid
        WHERE {{ 
            ?observation typeOf Observation .
            ?observation statisticalVariable {} . 
            ?observation observedNodeLocation {} .
            ?observation dcid ?dcid .
            ?observation observationDate "{}" .
            {}
            {}
        }}
    '''.format(stat_var_id, place_id, date, measurement_method_line,
               observation_period_line)
    result = ""
    (_, rows) = dc.query(sparql_query)
    if len(rows) > 0:
        cells = rows[0].get("cells", [])
        if len(cells) > 0:
            result = cells[0].get('value', '')
    return Response(json.dumps(result), 200, mimetype='application/json')
