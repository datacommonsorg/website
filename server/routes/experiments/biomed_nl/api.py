# Copyright 2025 Google LLC
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
"""Endpoints for Biomed NL Search page"""

import json
import logging

from pydantic import BaseModel

import flask
from flask import current_app
from flask import request
from flask import Response
from google import genai
import enum

from server.routes.experiments.biomed_nl.traversal import PathFinder
import server.routes.experiments.biomed_nl.utils as utils

GEMINI_PRO = 'gemini-1.5-pro'
GEMINI_PRO_TOKEN_LIMIT = 2097152

# Define blueprint
bp = flask.Blueprint('biomed_nl_api',
                     __name__,
                     url_prefix='/api/experiments/biomed_nl')


class TripleDirection(enum.Enum):
  OUTGOING = "Outgoing"
  INCOMING = "Incoming"


class SubjectPredicate(BaseModel):
  key: int
  source: str
  direction: TripleDirection
  prop: str
  linked_type: str


class FinalAnswerResponse(BaseModel):
  answer: str
  references: list[SubjectPredicate]
  additional_entity_names: list[str]
  additional_entity_dcids: list[str]


def _fulfill_traversal_query(query):
  response = {'answer': '', 'debug': ''}
  # TODO: remove extensive try-catch block once this api is stable
  try:
    gemini_api_key = current_app.config['BIOMED_NL_GEMINI_API_KEY']
    gemini_client = genai.Client(
        api_key=gemini_api_key,
        http_options=genai.types.HttpOptions(api_version='v1alpha'))

    path_finder = PathFinder(query, gemini_client, gemini_model_str=GEMINI_PRO)

    traversed_entity_info = path_finder.run()

    response['debug'] += '\n' + utils.format_dict(
        path_finder.path_store.get_paths_from_start(only_selected_paths=True))

    # TODO: add error handling.
    print(traversed_entity_info)  # DO_NOT_SUBMIT
    final_prompt = utils.FINAL_RESPONSE_PROMPT.format(
        QUERY=query, ENTITY_INFO=utils.format_dict(traversed_entity_info))

    input_tokens = gemini_client.models.count_tokens(
        contents=final_prompt, model=GEMINI_PRO).total_tokens
    final_response = None
    if input_tokens < GEMINI_PRO_TOKEN_LIMIT:
      gemini_response = gemini_client.models.generate_content(
          model=GEMINI_PRO,
          contents=final_prompt,
          config={
              'response_mime_type': 'application/json',
              'response_schema': FinalAnswerResponse,
          })
      final_response = FinalAnswerResponse(**json.loads(gemini_response.text))
    else:
      # Todo add log message
      response['debug'] += '\nFetched data too large for Gemini'
      return response

    response['answer'] = final_response.answer
    response['footnotes'] = '\n'.join(
        [ref.model_dump_json(indent=2) for ref in final_response.references])
  except Exception as e:
    logging.error(f'[biomed_nl]: {e}', exc_info=True)
    response['debug'] += f'\nERROR:{e}'

  return response\


@bp.route('/query')
def llm_search():
  query = request.args.get('q')
  if not query:
    return 'error: q param is required', 400
  result = _fulfill_traversal_query(query)
  return Response(json.dumps(result), 200, mimetype='application/json')
