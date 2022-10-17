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

from flask import Blueprint, current_app, request, Response
from cache import cache
import services.ai as ai
import services.datacommons as dc

# Define blueprint
bp = Blueprint("stats", __name__, url_prefix='/api/stats')

# Temporary fix for messy svgs. Remove once svgs have been fixed. SVGs that are
# blocklisted here must be part of either blocklistedSvgIds or miscellaneousSvgIds
# in the mixer file /internal/server/statvar/statvar_hierarchy_util.go
BLOCKLISTED_STAT_VAR_GROUPS = {
    "dc/g/Establishment_Industry", "dc/g/Uncategorized"
}
UPDATE_NUM_DESCENDENTS_SVG = {"dc/g/Establishment", "dc/g/Employment"}
NUM_DESCENDENTS_TO_SUBTRACT = 12123

# TODO(shifucun): add unittest for this module


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


@bp.route('/stat-var-summary', methods=["POST"])
def get_statvar_summary():
    """Gets the summaries for a list of stat vars.
    """
    stat_vars = request.json.get("statVars")
    result = dc.get_statvar_summary(stat_vars)
    return Response(json.dumps(result.get("statVarSummary", {})),
                    200,
                    mimetype='application/json')


@bp.route('/propvals/<string:prop>/<path:dcids>')
def get_property_value(dcids, prop):
    """Returns the property values for given node dcids and property label."""
    response = dc.property_values(dcids.split('^'), prop)
    return Response(json.dumps(response), 200, mimetype='application/json')


@bp.route('/stat-var-search')
@cache.cached(timeout=3600 * 24, query_string=True)
def search_statvar():
    """Gets the statvars and statvar groups that match the tokens in the query
    """
    query = request.args.get("query")
    places = request.args.getlist("places")
    sv_only = request.args.get("svOnly", False)
    result = dc.search_statvar(query, places, sv_only)
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/stat-var-search-ai')
@cache.cached(timeout=3600 * 24, query_string=True)
def search_statvar_ai():
    """Gets the statvars and statvar groups that match the tokens in the query
    """
    query = request.args.get("query")
    result = ai.search(current_app.config["AI_CONTEXT"], query)
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/stat-var-group')
@cache.cached(timeout=3600 * 24, query_string=True)
def get_statvar_group():
    """Gets the stat var group node information.

    This is to retrieve the adjacent nodes, including child stat vars, child stat
    var groups and parent stat var groups for the given stat var group node.
    """
    stat_var_group = request.args.get("stat_var_group")
    entities = request.args.getlist("entities")
    result = dc.get_statvar_group(stat_var_group, entities)
    if current_app.config["ENABLE_BLOCKLIST"]:
        childSVG = result.get("childStatVarGroups", [])
        filteredChildSVG = []
        for svg in childSVG:
            svg_id = svg.get("id", "")
            if svg_id in BLOCKLISTED_STAT_VAR_GROUPS:
                continue
            svg_num_descendents = svg.get("descendentStatVarCount", 0)
            if svg_id in UPDATE_NUM_DESCENDENTS_SVG and svg_num_descendents > NUM_DESCENDENTS_TO_SUBTRACT:
                svg["descendentStatVarCount"] = svg_num_descendents - NUM_DESCENDENTS_TO_SUBTRACT
            filteredChildSVG.append(svg)
        result["childStatVarGroups"] = filteredChildSVG
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/stat-var-path')
@cache.cached(timeout=3600 * 24, query_string=True)
def get_statvar_path():
    """Gets the path of a stat var to the root of the stat var hierarchy.
    """
    id = request.args.get("id")
    result = dc.get_statvar_path(id)
    return Response(json.dumps(result), 200, mimetype='application/json')