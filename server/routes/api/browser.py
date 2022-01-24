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
from flask import Response
from flask import request
from flask import current_app
import routes.api.place as place_api
import logging

bp = flask.Blueprint('api.browser', __name__, url_prefix='/api/browser')

NO_MMETHOD_KEY = 'no_mmethod'
NO_OBSPERIOD_KEY = 'no_obsPeriod'


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/triples/<path:dcid>')
def triple_api(dcid):
    """Returns all the triples given a node dcid."""
    return json.dumps(dc.get_triples([dcid]).get(dcid, []))


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/propvals/<path:prop>/<path:dcid>')
def get_property_value(dcid, prop):
    """Returns the property values for a given node dcid and property label."""
    response = dc.fetch_data('/node/property-values', {
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


def get_sparql_query(place_id, stat_var_id, date):
    date_triple = "?svObservation observationDate ?obsDate ."
    date_selector = " ?obsDate"
    if date:
        date_triple = f'?svObservation observationDate "{date}" .'
        date_selector = ""
    sparql_query = f"""
        SELECT ?dcid ?mmethod ?obsPeriod{date_selector}
        WHERE {{
            ?svObservation typeOf StatVarObservation .
            ?svObservation variableMeasured {stat_var_id} .
            ?svObservation observationAbout {place_id} .
            ?svObservation dcid ?dcid .
            ?svObservation measurementMethod ?mmethod .
            ?svObservation observationPeriod ?obsPeriod .
            {date_triple}
        }}
    """
    return sparql_query


@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
@bp.route('/observation-id')
def get_observation_id():
    """Returns the observation node dcid for a combination of
    predicates: observedNodeLocation, statisticalVariable, date,
    measurementMethod optional), observationPeriod (optional)"""
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
    date = request.args.get("date", "")
    if not date:
        return Response(json.dumps("error: must provide a date field"),
                        400,
                        mimetype='application/json')
    request_mmethod = request.args.get("measurementMethod", NO_MMETHOD_KEY)
    request_obsPeriod = request.args.get("obsPeriod", NO_OBSPERIOD_KEY)
    sparql_query = get_sparql_query(place_id, stat_var_id, date)
    result = ""
    (_, rows) = dc.query(sparql_query)
    for row in rows:
        cells = row.get('cells', [])
        if len(cells) != 3:
            continue
        dcid = cells[0].get('value', '')
        mmethod = cells[1].get('value', NO_MMETHOD_KEY)
        obsPeriod = cells[2].get('value', NO_OBSPERIOD_KEY)
        if mmethod == request_mmethod and obsPeriod == request_obsPeriod:
            result = dcid
            break
    return Response(json.dumps(result), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/num_stat_vars/<path:dcid>')
def get_num_statvars(dcid):
    """Returns number of stat vars for a dcid
    """
    statsvars = place_api.statsvars(dcid)
    num_statvars = len(statsvars)
    return Response(json.dumps(num_statvars), 200, mimetype='application/json')
