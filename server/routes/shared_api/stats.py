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
  dcids = request.args.getlist('dcids')
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
    query = request.args.get("query")
    entities = request.args.getlist("entities")
    sv_only = request.args.get("svOnly", False)
    limit = int(request.args.get("limit", 100))
  else:  # Method is POST
    query = request.json.get("query")
    entities = request.json.get("entities", [])
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
  elif current_app.config.get("ENABLE_MODEL", False) and current_app.config.get(
      "CUSTOM", False):
    # If we do not use VAI, but do have model enabled and are custom we use v2/resolve
    url = dc.get_service_url("/v2/resolve")
    resolve_resp = dc.post(
        url, {
            "nodes": [query],
            "property": "<-description->dcid",
            "resolver": "indicator"
        })

    candidates = []
    for ent in resolve_resp.get("entities", []):
      for candidate in ent.get("candidates", []):
        candidates.append({"dcid": candidate.get("dcid")})

    # Filter out variables that have no data for the given entities
    valid_statvars = []
    if entities:
      url = dc.get_service_url("/v2/observation")
      obs_resp = dc.post(
          url, {
              "variable": {
                  "dcids": [c["dcid"] for c in candidates]
              },
              "entity": {
                  "dcids": entities
              },
              "select": ["variable", "entity"]
          })

      by_var = obs_resp.get("byVariable", {})
      for c in candidates:
        if c["dcid"] in by_var and by_var[c["dcid"]].get("byEntity"):
          valid_statvars.append(c)
    else:
      valid_statvars = candidates

    # Filter out StatVarGroups and Topics
    typed_statvars = []
    if valid_statvars:
      node_resp = dc.post(dc.get_service_url("/v2/node"), {
          "nodes": [c["dcid"] for c in valid_statvars],
          "property": "->typeOf"
      })
      for c in valid_statvars:
        node_arcs = node_resp.get("data", {}).get(c["dcid"], {}).get("arcs", {})
        types = [
            n.get("dcid") for n in node_arcs.get("typeOf", {}).get("nodes", [])
        ]
        if "StatVarGroup" not in types and "Topic" not in types:
          typed_statvars.append(c)

    filtered_statvars = typed_statvars

    # Pull out the DCIDs of the stat vars that pass the filter
    filtered_dcids = [sv["dcid"] for sv in filtered_statvars]

    # fetch names for the DCIDs.
    names_map = {}
    if filtered_dcids:
      names_resp = dc.v2node(filtered_dcids, "->name")
      for dcid, node_data in names_resp.get("data", {}).items():
        name_nodes = node_data.get("arcs", {}).get("name", {}).get("nodes", [])
        if name_nodes:
          names_map[dcid] = name_nodes[0].get("value")

    for sv in filtered_statvars:
      sv["name"] = names_map.get(sv["dcid"], "")

    result = {"statVars": filtered_statvars, "matches": [], "statVarGroups": []}
  else:
    result = {"matches": [], "statVars": [], "statVarGroups": []}
  return Response(json.dumps(result), 200, mimetype='application/json')
