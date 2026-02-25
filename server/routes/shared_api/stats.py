# Copyright 2020 Google LLC
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
import logging

from flask import Blueprint
from flask import current_app
from flask import request
from flask import Response
from google.cloud import discoveryengine_v1 as discoveryengine
from markupsafe import escape

from server.lib import fetch
from server.lib import shared
from server.lib import vertex_ai
from server.lib.cache import cache
from server.lib.feature_flags import is_feature_enabled
from server.lib.feature_flags import VAI_FOR_STATVAR_SEARCH_FEATURE_FLAG
import server.lib.util as lib_util
from server.routes import TIMEOUT
import server.services.datacommons as dc

# TODO(shifucun): add unittest for this module

# Define blueprint
bp = Blueprint("stats", __name__, url_prefix='/api/stats')

logger = logging.getLogger(__name__)

def _escaped_arg(name: str, default=None):
  value = request.args.get(name, default)
  if value is None:
    return None
  return str(escape(value))


def _escaped_arg_list(name: str) -> list[str]:
  return [str(escape(v)) for v in request.args.getlist(name)]


def _escaped_list(values) -> list[str]:
  if not values:
    return []
  return [str(escape(v)) for v in values]


# Constants for Vertex AI Search Application
# TODO: Move the VAI app to a different GCP project and figure out a better way to authenticate (ex. use API keys)
VAI_PROJECT_ID = "datcom-nl"
VAI_LOCATION = "global"
VAI_ENGINE_ID = "full-statvar-search-prod-p_1757437817854"
VAI_SERVING_CONFIG_ID = "default_config"


@bp.route('/stat-var-property')
def stat_var_property():
  """Handler to get the properties of give statistical variables.

  Returns:
      A dictionary keyed by stats var dcid with value being a dictionary of
      all the properties of each stats var.
  """
  dcids = _escaped_arg_list('dcids')
  ranked_statvars = current_app.config['RANKED_STAT_VARS']
  result = {}
  resp = fetch.triples(dcids)
  # Get all the constraint properties
  for dcid, arcs in resp.items():
    pvs = {}
    for pred, nodes in arcs.items():
      if pred == 'constraintProperties':
        for node in nodes:
          pvs[node['dcid']] = ''
    pt = ''
    md = ''
    mprop = ''
    st = ''
    mq = ''
    name = dcid
    for pred, nodes in arcs.items():
      objId = nodes[0].get('dcid', '')
      objVal = nodes[0].get('value', '')
      if pred == 'measuredProperty':
        mprop = objId
      if pred == 'populationType':
        pt = objId
      if pred == 'measurementDenominator':
        md = objId
      if pred == 'statType':
        st = objId
      if pred == 'name':
        name = objVal
      if pred == 'measurementQualifier':
        mq = objId
      if pred in pvs:
        pvs[pred] = objId if objId else objVal

    result[dcid] = {
        'mprop':
            mprop,
        'pt':
            pt,
        'md':
            md,
        'st':
            st,
        'mq':
            mq,
        'pvs':
            pvs,
        'title':
            name,
        'ranked':
            dcid in ranked_statvars,
        'pcAllowed':
            current_app.config['ENABLE_PER_CAPITA'] and
            shared.is_percapita_relevant(dcid, current_app.config['NOPC_VARS'])
    }
  return result


@bp.route('/stat-var-search', methods=('GET', 'POST'))
@cache.cached(timeout=TIMEOUT,
              query_string=True,
              make_cache_key=lib_util.post_body_cache_key)
def search_statvar():
  """Gets the statvars and statvar groups that match the tokens in the query."""
  is_vai_enabled = is_feature_enabled(VAI_FOR_STATVAR_SEARCH_FEATURE_FLAG,
                                      request=request)
  if request.method == 'GET':
    query = _escaped_arg("query")
    entities = _escaped_arg_list("entities")
    sv_only = request.args.get("svOnly", "false").lower() == 'true'
    limit = int(request.args.get("limit", 100))
  else:  # Method is POST
    query = str(escape(request.json.get("query"))) if request.json.get(
        "query") else None
    entities = _escaped_list(request.json.get("entities", []))
    sv_only = request.json.get("svOnly")
    limit = int(request.json.get("limit", 100))

  if is_vai_enabled:
    statVars = []
    page_token = None
    # If filtering by entities, fetch 3x the number of results to act as a buffer for filtering.
    # No buffer if the limit is set to 1000, as otherwise VAI search would take too long.
    # TODO: Add the ability to load more results when filtering by sources.
    initial_limit = limit * 3 if limit == 100 and len(entities) else limit
    relevance_threshold = discoveryengine.SearchRequest.RelevanceThreshold.LOW

    while len(statVars) < initial_limit:
      search_results = vertex_ai.search(project_id=VAI_PROJECT_ID,
                                        location=VAI_LOCATION,
                                        engine_id=VAI_ENGINE_ID,
                                        serving_config_id=VAI_SERVING_CONFIG_ID,
                                        query=query,
                                        page_size=100,
                                        page_token=page_token,
                                        relevance_threshold=relevance_threshold)
      for response in search_results.results:
        dcid = response.document.struct_data.get("dcid")
        name = response.document.struct_data.get("name")
        if not dcid or not name:
          logger.warning(
              f"There's an issue with DCID or name for the stat var search result: {response.document.struct_data}"
          )
          continue
        statVars.append({
            "name": name,
            "dcid": dcid,
        })
        if len(statVars) >= initial_limit:
          break
      page_token = search_results.next_page_token
      if not page_token:
        break

    result = dc.filter_statvars(statVars, entities)
  else:
    result = dc.search_statvar(query, entities, sv_only)
  return Response(json.dumps(result), 200, mimetype='application/json')
