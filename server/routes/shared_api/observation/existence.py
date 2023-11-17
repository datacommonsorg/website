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
from flask import Response

from server.lib import fetch

# Define blueprint
bp = Blueprint("observation_existence", __name__)


@bp.route('/api/observation/existence', methods=['POST'])
def observation_existence():
  """Check if statistical variables that exist for some places.

  Returns:
      Map from variable to place to a boolean of whether there is observation.
  """
  variables = request.json.get('variables', [])
  entities = request.json.get('entities', [])
  return Response(json.dumps(fetch.observation_existence(variables, entities)),
                  200,
                  mimetype='application/json')
