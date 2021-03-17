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
@bp.route('/observation-ids')
def get_observation_ids():
    """Returns a mapping of date to observation node dcid for a combination of predicates: 
    observedNodeLocation, statisticalVariable, measurementMethod (optional), observationPeriod (optional)"""
    place_id = request.args.get("place")
    if not place_id:
        return Response(json.dumps("error: must provide a place field"),
                        400,
                        mimetype='application/json')
    stat_var_id = request.args.get("statVar")
    if not stat_var_id:
        return Response(json.dumps("error: must provide a statVar field"),
                        400,
                        mimetype='application/json')
    measurement_method = request.args.get("measurementMethod", "")
    observation_period = request.args.get("obsPeriod", "")
    measurement_method_line = ""
    if measurement_method:
        measurement_method_line = f"""?svObservation measurementMethod {measurement_method} ."""
    observation_period_line = ""
    if observation_period:
        observation_period_line = f"""?svObservation observationPeriod {observation_period} ."""
    sparql_query = '''
        SELECT ?dcid ?obsDate
        WHERE {{ 
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured {} . 
            ?svObservation observationAbout {} .
            ?svObservation dcid ?dcid .
            ?svObservation observationDate ?obsDate .
            {}
            {}
        }}
    '''.format(stat_var_id, place_id, measurement_method_line,
               observation_period_line)
    result = ""
    (_, rows) = dc.query(sparql_query)
    result = {}
    for row in rows:
        cells = row.get('cells', [])
        if not len(cells) == 2:
            continue
        obsDate = cells[1].get('value', '')
        dcid = cells[0].get('value', '')
        result[obsDate] = dcid
    return Response(json.dumps(result), 200, mimetype='application/json')
