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
import lib.statvar_hierarchy_search as svh_search
from services.datacommons import fetch_data
from flask import Response
from flask import request
import routes.api.place as place_api

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


def statvar_hierarchy_helper(svg_id, svg_map, processed_svg_map, processed_sv,
                             seen_sv, level):
    """Processes the childStatVars and childStatVarGroups of a stat var group.
    Adds parent field for those processed statVars and statVarGroups.

    Args:
        svg_id: stat var group of interest
        svg_map: mapping of svg_id to the unprocessed svg object
        processed_svg_map: mapping of svg_id to the processed svg object
        processed_sv: mapping of stat var id to the processed stat var object
        seen_sv: stat vars that have already been processed
    """
    svg = svg_map.get(svg_id, {})
    for child_sv in svg.get("childStatVars", []):
        if child_sv["id"] in seen_sv:
            continue
        child_sv["parent"] = svg_id
        processed_sv[child_sv["id"]] = child_sv
        seen_sv.add(child_sv["id"])
    for child_svg in svg.get("childStatVarGroups", []):
        child_svg_id = child_svg.get("id")
        child_svg = processed_svg_map.get(child_svg_id, svg_map[child_svg_id])
        child_svg["parent"] = svg_id
        child_svg["level"] = level
        processed_svg_map[child_svg_id] = child_svg
        seen_sv.add(child_svg_id)
        statvar_hierarchy_helper(child_svg_id, svg_map, processed_svg_map,
                                 processed_sv, seen_sv, level + 1)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/statvar-hierarchy', methods=['POST'])
def get_statvar_hierarchy():
    """Returns the stat var groups objects and stat vars objects relevant to a
    specific dcid.

    Each stat var group object (keyed by its stat var group id) will have an
    absolute name, optional list of child stat vars, optional list of child stat
    var groups, and optional list of parent stat var groups.

    Each stat var object (keyed by its stat var id) will have its parent stat
    var group id.
    """
    dcids = request.json.get('dcids', [])
    svg_map = dc.get_statvar_groups(dcids)
    processed_svg_map = {}
    processed_sv = {}
    seen_sv = set()
    for svg_id, svg in svg_map.items():
        if svg_id in seen_sv:
            continue
        svg["level"] = 0
        processed_svg_map[svg_id] = svg
        statvar_hierarchy_helper(svg_id, svg_map, processed_svg_map,
                                 processed_sv, seen_sv, 1)
    for _, sv in processed_sv.items():
        parent_svg = processed_svg_map.get(sv["parent"])
        sv["level"] = parent_svg["level"] + 1
    result = {}
    result["statVarGroups"] = processed_svg_map
    result["statVars"] = processed_sv
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/search_statvar_hierarchy')
@cache.cached(timeout=3600 * 24, query_string=True)
def search_statvar_hierarchy():
    """Gets the statvars and statvar groups that match the tokens in the query
    """
    query = request.args.get("query").lower()
    query = query.replace(",", " ")
    tokens = query.split()
    result = svh_search.get_search_result(tokens)
    return Response(json.dumps(list(result)), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@bp.route('/num_stat_vars/<path:dcid>')
def get_num_statvars(dcid):
    """Returns number of stat vars for a dcid
    """
    statsvars = place_api.statsvars(dcid)
    num_statvars = len(statsvars)
    return Response(json.dumps(num_statvars), 200, mimetype='application/json')