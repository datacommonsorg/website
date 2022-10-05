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

from flask import Blueprint, request
import services.datacommons as dc
# Define blueprint
bp = Blueprint('point', __name__, url_prefix='/api/observations/point')


def compact_point(point_resp, all_facets):
    result = {
        'facets': point_resp.get('facets', {}),
    }
    data = {}
    for obs_by_variable in point_resp['observationsByVariable']:
        var = obs_by_variable['variable']
        data[var] = {}
        for obs_by_entity in obs_by_variable['observationsByEntity']:
            entity = obs_by_entity['entity']
            data[var][entity] = None
            if 'pointsByFacet' in obs_by_entity:
                if all_facets:
                    data[var][entity] = obs_by_entity['pointsByFacet']
                else:
                    # There should be only one point.
                    data[var][entity] = obs_by_entity['pointsByFacet'][0]
            else:
                if all_facets:
                    data[var][entity] = []
                else:
                    data[var][entity] = {}
    result['data'] = data
    return result


def point_core(entities, variables, date, all_facets):
    resp = dc.point(entities, variables, date, all_facets)
    return compact_point(resp, all_facets)


def point_within_core(parent_entity, child_type, variables, date, all_facets):
    resp = dc.point_within(parent_entity, child_type, variables, date,
                           all_facets)
    return compact_point(resp, all_facets)


@bp.route('', strict_slashes=False, methods=['POST'])
def point():
    """Handler to get the observation point given multiple stat vars and places.
    """
    entities = request.json.get('entities', [])
    variables = request.json.get('variables', [])
    if not entities:
        return 'error: must provide a `entities` field', 400
    if not variables:
        return 'error: must provide a `variables` field', 400
    date = request.json.get('date', '')
    return point_core(entities, variables, date, False)


@bp.route('/all', methods=['POST'])
def point_all():
    """Handler to get all the observation points given multiple stat vars and
    entities.
    """
    entities = request.json.get('entities', [])
    variables = request.json.get('variables', [])
    if not entities:
        return 'error: must provide a `entities` field', 400
    if not variables:
        return 'error: must provide a `variables` field', 400
    date = request.json.get('date')
    return point_core(entities, variables, date, True)


@bp.route('/within', methods=['POST'])
def point_within():
    """Gets the observations for child entities of a certain place
    type contained in a parent entity at a given date. If no date given, will
    return values for most recent date.

    This returns the observation for the preferred facet.
    """
    parent_entity = request.json.get('parent_entity')
    if not parent_entity:
        return 'error: must provide a `parent_entity` field', 400
    child_type = request.json.get('child_type')
    if not child_type:
        return 'error: must provide a `child_type` field', 400
    variables = request.json.get('variables')
    if not variables:
        return 'error: must provide a `variables` field', 400
    date = request.json.get('date')
    return point_within_core(parent_entity, child_type, variables, date, False)


@bp.route('/within/all', methods=['POST'])
def point_within_all():
    """Gets the observations for child entities of a certain place
    type contained in a parent entity at a given date. If no date given, will
    return values for most recent date.

    This returns the observation for all facets.
    """
    parent_entity = request.json.get('parent_entity')
    if not parent_entity:
        return 'error: must provide a `parent_entity` field', 400
    child_type = request.json.get('child_type')
    if not child_type:
        return 'error: must provide a `child_type` field', 400
    variables = request.json.get('variables')
    if not variables:
        return 'error: must provide a `variables` field', 400
    date = request.json.get('date', '')
    return point_within_core(parent_entity, child_type, variables, date, True)