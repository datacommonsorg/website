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
bp = Blueprint("observation-dates", __name__)


@bp.route('/api/observation-dates')
def observation_dates():
    """
    Given ancestor place, child place type and stat vars, return the dates that
	have data for each stat var across all child places.
    """
    ancestor_place = request.args.get('ancestorPlace')
    if not ancestor_place:
        return 'error: must provide a ancestorPlace field', 400
    child_place_type = request.args.get('childPlaceType')
    if not child_place_type:
        return 'error: must provide a childPlaceType field', 400
    stat_var = request.args.get('statVar')
    if not stat_var:
        return 'error: must provide a statVars field', 400
    return dc.post(
        '/v1/bulk/observation-dates/linked', {
            'linked_property': "containedInPlace",
            'linked_entity': ancestor_place,
            'entity_type': child_place_type,
            'variables': [stat_var],
        })