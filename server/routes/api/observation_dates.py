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

from flask import Blueprint
from flask import request

import server.services.datacommons as dc

# Define blueprint
bp = Blueprint("observation_dates", __name__)


@bp.route('/api/observation-dates')
def observation_dates():
  """Given ancestor place, child place type and stat vars, return the dates that
	have data for each stat var across all child places.
  """
  parent_entity = request.args.get('parentEntity')
  if not parent_entity:
    return 'error: must provide a parentEntity field', 400
  child_type = request.args.get('childType')
  if not child_type:
    return 'error: must provide a childType field', 400
  variable = request.args.get('variable')
  if not variable:
    return 'error: must provide a variable field', 400
  return dc.get_series_dates(parent_entity, child_type, [variable])
