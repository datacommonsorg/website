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
"""Data Commons search related routes."""

import flask
from flask import Blueprint
from flask import current_app
from flask import request

import server.services.datacommons as dc

bp = Blueprint('search', __name__)

_MAX_SEARCH_RESULTS = 1000


@bp.route('/search')
def search():
  """Custom search page"""
  query = request.args.get('q', '')
  return flask.render_template('search.html',
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               query=query)


@bp.route('/search_dc')
def search_dc():
  """Add DC API powered search for non-place searches temporarily"""
  query_text = request.args.get('q', '')
  max_results = int(request.args.get('l', _MAX_SEARCH_RESULTS))
  if query_text:
    search_response = dc.search(query_text, max_results)
  else:
    search_response = {}

  results = []

  # Convert from search results to template dictionary.
  query_tokens = set(query_text.lower().split())
  for section in search_response.get('section', []):
    entities = []
    for search_entity in section['entity']:
      entity = {}
      entity['name'] = search_entity['name']
      entity['dcid'] = search_entity['dcid']
      name_tokens = search_entity['name'].lower().split()
      for i, t in enumerate(name_tokens):
        name_tokens[i] = t.strip("'")
      name_tokens = set(name_tokens)
      if not name_tokens & query_tokens:
        continue
      entity['rank'] = len(name_tokens & query_tokens) / len(name_tokens |
                                                             query_tokens)
      entities.append(entity)
    entities = sorted(entities, key=lambda e: (e['rank']), reverse=True)
    if entities:
      results.append({
          'type': section['typeName'],
          'entities': entities,
      })
  return flask.render_template('search_dc.html',
                               query_text=query_text,
                               results=results)
