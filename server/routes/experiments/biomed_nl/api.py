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
# """Endpoints for Biomed NL Search page"""

import json

import flask
from flask import current_app
from flask import request
from flask import Response
from google import genai

from server.routes.experiments.biomed_nl.entity_recognition import \
    get_traversal_start_entities
from server.routes.experiments.biomed_nl.traversal import PathFinder
import server.routes.experiments.biomed_nl.utils as utils

GEMINI_PRO = 'gemini-1.5-pro'

# Define blueprint
bp = flask.Blueprint('biomed_nl_api',
                     __name__,
                     url_prefix='/api/experiments/biomed_nl')


def _fulfill_traversal_query(query):
  gemini_api_key = current_app.config['BIOMED_NL_GEMINI_API_KEY']
  gemini_client = genai.Client(
      api_key=gemini_api_key,
      http_options=genai.types.HttpOptions(api_version='v1alpha'))

  (entities_to_dcids, selected_entities, annotated_query,
   response_token_counts) = get_traversal_start_entities(query, gemini_client)

  start_entity = selected_entities[0] if len(selected_entities) else ''
  start_dcids = entities_to_dcids.get(start_entity, [])

  if not start_entity or not start_dcids:
    # TODO: log error
    return {'response': 'error in recognition'}

  path_finder = PathFinder(annotated_query,
                           start_entity,
                           start_dcids,
                           gemini_client,
                           gemini_model_str=GEMINI_PRO)
  path_finder.find_paths()
  # TODO: Add error handling before constructing cache.
  print(path_finder.path_store.selected_paths)
  cache = path_finder.build_traversal_cache()
  # TODO: add error handling.

  final_prompt = utils.FINAL_PROMPT.format(sentence=query,
                                           json_str=utils.format_dict(cache))
  response = gemini_client.models.generate_content(model=GEMINI_PRO,
                                                   contents=final_prompt)

  return {
      'response': response.text,
      'selected_path': utils.format_dict(path_finder.path_store.selected_paths)
  }


@bp.route('/query')
def llm_search():
  query = request.args.get('q')
  if not query:
    return 'error: q param is required', 400
  result = _fulfill_traversal_query(query)
  return Response(json.dumps(result), 200, mimetype='application/json')
