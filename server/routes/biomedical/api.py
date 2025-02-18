# # Copyright 2025 Google LLC
# #
# # Licensed under the Apache License, Version 2.0 (the "License");
# # you may not use this file except in compliance with the License.
# # You may obtain a copy of the License at
# #
# #      http://www.apache.org/licenses/LICENSE-2.0
# #
# # Unless required by applicable law or agreed to in writing, software
# # distributed under the License is distributed on an "AS IS" BASIS,
# # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# # See the License for the specific language governing permissions and
# # limitations under the License.
# """Endpoints for LLM Search page"""

import json

import flask
from flask import current_app
from flask import request
from flask import Response

# Define blueprint
bp = flask.Blueprint('biomedical_api',
                     __name__,
                     url_prefix='/biomedical/nl')

@bp.route('/query')
def llm_search():
  query = request.args.get('query')
  if not query:
    return 'error: must provide a query field', 400
  result = {'answer': 'hello', 'debug': 'world'}
  return Response(json.dumps(result), 200, mimetype='application/json')
