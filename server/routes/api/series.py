# Copyright 2022 Google LLC
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

from flask import Blueprint, request, Response
import services.datacommons as dc

# Define blueprint
bp = Blueprint("series", __name__, url_prefix='/api/observations/series')


def compact_series(series_resp, all_facets):
    result = {
        'facets': series_resp.get('facets', {}),
    }
    data = {}
    for obs_by_variable in series_resp['observationsByVariable']:
        var = obs_by_variable['variable']
        data[var] = {}
        for obs_by_entity in obs_by_variable['observationsByEntity']:
            entity = obs_by_entity['entity']
            data[var][entity] = None
            if 'seriesByFacet' in obs_by_entity:
                if all_facets:
                    data[var][entity] = obs_by_entity['seriesByFacet']
                else:
                    # There should be only one series
                    data[var][entity] = obs_by_entity['seriesByFacet'][0]
            else:
                if all_facets:
                    data[var][entity] = []
                else:
                    data[var][entity] = {}
    result['data'] = data
    return result


def series_core(entities, variables, all_facets):
    resp = dc.series(entities, variables, all_facets)
    return compact_series(resp, all_facets)


def series_within_core(parent_entity, child_type, variables, all_facets):
    resp = dc.series_within(parent_entity, child_type, variables, all_facets)
    return compact_series(resp, all_facets)


@bp.route('', strict_slashes=False, methods=['POST'])
def series():
    """Handler to get preferred time series given multiple stat vars and places.
    """
    entities = request.json.get('entities', [])
    variables = request.json.get('variables', [])
    return series_core(entities, variables, False)


@bp.route('/all', methods=['POST'])
def series_all():
    """Handler to get all the time series given multiple stat vars and places.
    """
    entities = request.json.get('entities', [])
    variables = request.json.get('variables', [])
    return series_core(entities, variables, True)


@bp.route('/within', methods=['POST'])
def series_within():
    """Gets the statistical variable values for child entities of a certain place
    type contained in a parent entity at a given date. If no date given, will
    return values for most recent date.
    """
    parent_entity = request.json.get("parent_entity")
    if not parent_entity:
        return Response(json.dumps("error: must provide a parent_entity field"),
                        400,
                        mimetype='application/json')
    child_type = request.json.get("child_type")
    if not child_type:
        return Response(json.dumps("error: must provide a child_type field"),
                        400,
                        mimetype='application/json')
    variables = request.json.get("variables")
    if not variables:
        return Response(json.dumps("error: must provide a variables field"),
                        400,
                        mimetype='application/json')
    return series_within_core(parent_entity, child_type, variables, False)


@bp.route('/within/all', methods=['POST'])
def series_within_all():
    """Gets the statistical variable values for child entities of a certain place
    type contained in a parent entity at a given date. If no date given, will
    return values for most recent date.
    """
    parent_entity = request.json.get("parent_entity")
    if not parent_entity:
        return Response(json.dumps("error: must provide a parent_entity field"),
                        400,
                        mimetype='application/json')
    child_type = request.json.get("child_type")
    if not child_type:
        return Response(json.dumps("error: must provide a child_type field"),
                        400,
                        mimetype='application/json')
    variables = request.json.get("variables")
    if not variables:
        return Response(json.dumps("error: must provide a variables field"),
                        400,
                        mimetype='application/json')
    return series_within_core(parent_entity, child_type, variables, True)
