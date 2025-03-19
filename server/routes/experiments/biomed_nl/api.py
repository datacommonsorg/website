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

import enum
import json
import logging

import flask
from flask import current_app
from flask import request
from flask import Response
from google import genai
from pydantic import BaseModel

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


class CitedTripleReference(BaseModel):
  # the footnote number corresponding to this reference in Gemini's final response
  key: int
  # the subject of the cited triple
  source: str
  # the direction of the cited triple
  direction: TripleDirection
  # the property of the cited triple
  prop: str
  # the incoming type of the cited triple (only populated if direction is Incoming)
  linked_type: str


class FinalAnswerResponse(BaseModel):
  # The final reponse for the user's query
  answer: str
  # Triples cited in the final response
  references: list[CitedTripleReference]
  # Extra entities that Gemini would have wanted to form a complete repsonse
  additional_entity_names: list[str]
  additional_entity_dcids: list[str]


def _get_fallback_response(query, response, path_finder, traversed_entity_info,
                           gemini_client):
  entity_info = {
      dcid: traversed_entity_info[dcid]
      for dcid in path_finder.start_dcids
      if dcid in traversed_entity_info
  }
  entity_info['property_descriptions'] = traversed_entity_info.get(
      'property_descriptions', {})
  selected_paths = path_finder.path_store.get_paths_from_start(
      only_selected_paths=True)

  fallback_prompt = utils.FALLBACK_PROMPT.format(
      QUERY=query,
      START_ENT=path_finder.start_entity_name,
      START_DCIDS=', '.join(path_finder.start_dcids),
      SELECTED_PATHS=utils.format_dict(selected_paths),
      ENTITY_INFO=utils.format_dict(entity_info))

  gemini_response = gemini_client.models.generate_content(
      model=GEMINI_PRO, contents=fallback_prompt)
  response['answer'] = gemini_response.text
  response['debug'] += '\nFetched data too large for Gemini'
  return response


def _fulfill_traversal_query(query):
  response = {'answer': '', 'debug': ''}
  # TODO: remove extensive try-catch block once this api is stable

  gemini_api_key = current_app.config['BIOMED_NL_GEMINI_API_KEY']
  gemini_client = genai.Client(
      api_key=gemini_api_key,
      http_options=genai.types.HttpOptions(api_version='v1alpha'))

  path_finder = PathFinder(query, gemini_client, gemini_model_str=GEMINI_PRO)

  traversed_entity_info = {}
  try:
    path_finder.find_start_and_traversal_type()

    if path_finder.traversal_type == PathFinder.TraversalTypes.OVERVIEW:
      # Skip traversal and fetch data for the entities
      path_finder.path_store.selected_paths = {
          dcid: {} for dcid in path_finder.start_dcids
      }
    else:
      path_finder.find_paths()

    traversed_entity_info = path_finder.get_traversed_entity_info()

  except Exception as e:
    logging.error(f'[biomed_nl]: {e}', exc_info=True)
    if path_finder.start_dcids:
      response[
          'answer'] = f'{path_finder.start_entity_name}: {", ".join(path_finder.start_dcids)}'
    else:
      response[
          'answer'] = 'Error finding entities from the query in the knowledge graph.'
    return response

  try:
    response['debug'] += '\n' + utils.format_dict(
        path_finder.path_store.get_paths_from_start(only_selected_paths=True))

    # TODO: add error handling.
    final_prompt = utils.FINAL_RESPONSE_PROMPT.format(
        QUERY=query, ENTITY_INFO=utils.format_dict(traversed_entity_info))

    input_tokens = gemini_client.models.count_tokens(
        contents=final_prompt, model=GEMINI_PRO).total_tokens

    should_include_fallback = False
    if input_tokens < GEMINI_PRO_TOKEN_LIMIT * 0.75:
      gemini_response = gemini_client.models.generate_content(
          model=GEMINI_PRO,
          contents=final_prompt,
          config={
              'response_mime_type': 'application/json',
              'response_schema': FinalAnswerResponse,
          })
      final_response = FinalAnswerResponse(**json.loads(gemini_response.text))
      response['answer'] = final_response.answer
      response['footnotes'] = '\n'.join(
          [ref.model_dump_json(indent=2) for ref in final_response.references])
    else:
      should_include_fallback = True

    # TODO: return fallback for traversal error + timeouts and uncertain final responses
    if should_include_fallback:
      _get_fallback_response(query, response, path_finder,
                             traversed_entity_info, gemini_client)
  except Exception as e:
    logging.error(f'[biomed_nl]: {e}', exc_info=True)
    response['debug'] += f'\nERROR:{e}'

  return response


@bp.route('/query')
def llm_search():
  query = request.args.get('q')
  if not query:
    return 'error: q param is required', 400
  result = _fulfill_traversal_query(query)
  return Response(json.dumps(result), 200, mimetype='application/json')
