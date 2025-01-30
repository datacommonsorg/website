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
"""Endpoints for DataGemma page"""

from data_gemma import DataCommons
from data_gemma import GoogleAIStudio
from data_gemma import RAGFlow
from data_gemma import RIGFlow
from data_gemma import VertexAI
import flask
from flask import current_app
from flask import request

# Define blueprint
bp = flask.Blueprint('dev_datagemma_api',
                     __name__,
                     url_prefix='/api/dev/datagemma')

_RIG_MODE = 'rig'
_RAG_MODE = 'rag'

# TODO: consider moving these specifications to a config somewhere
_VERTEX_AI_RIG = VertexAI(project_id='datcom-website-dev',
                          location='us-central1',
                          prediction_endpoint_id='4999251772590522368')
_VERTEX_AI_RAG = VertexAI(project_id='datcom-website-dev',
                          location='us-central1',
                          prediction_endpoint_id='3459865124959944704')


def _get_datagemma_answer(query, mode):
  dc_nl_service = DataCommons(api_key=current_app.config['DC_NL_API_KEY'])
  result = None
  if mode == _RIG_MODE:
    result = RIGFlow(llm=_VERTEX_AI_RIG,
                     data_fetcher=dc_nl_service).query(query=query)
  elif mode == _RAG_MODE:
    gemini_model = GoogleAIStudio(
        model='gemini-1.5-pro', api_keys=[current_app.config['GEMINI_API_KEY']])
    result = RAGFlow(llm_question=_VERTEX_AI_RAG,
                     llm_answer=gemini_model,
                     data_fetcher=dc_nl_service).query(query=query)
  if result:
    return result.answer()
  else:
    return ''


@bp.route('/query')
def datagemma_query():
  query = request.args.get('query')
  mode = request.args.get('mode')
  if not query:
    return "error: must provide a query field", 400
  if not mode or mode not in [_RIG_MODE, _RAG_MODE]:
    return f'error: must provide a mode field with values {_RIG_MODE} or {_RAG_MODE}', 400
  resp = _get_datagemma_answer(query, mode)
  return resp, 200
