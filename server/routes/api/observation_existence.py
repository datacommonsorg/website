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

import json

from flask import Blueprint
from flask import request

import server.services.datacommons as dc

# Define blueprint
bp = Blueprint("observation_existence", __name__)


@bp.route('/api/observation-existence')
def observation_existence():
  """Given a list of stat vars and entities, check whether observation exist for
  all the (variable,entity) pairs.
  """
  entities = request.args.getlist('entities')
  if not entities:
    return 'error: must provide entities field', 400
  variables = request.args.getlist('variables')
  if not variables:
    return 'error: must provide variables field', 400
  return json.dumps(dc.observation_existence(variables, entities))
