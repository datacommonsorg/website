# Copyright 2024 Google LLC
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
"""Copy of Data Commons Python Client API Core without pandas dependency."""

import asyncio
import collections
import json
import logging
from typing import Dict, List

from flask import current_app
from flask import has_app_context
from flask import has_request_context
from flask import request
import requests

from server.lib import log
from server.lib.cache import cache
from server.lib.cache import memoize_and_log_mixer_usage
from server.lib.cache import should_skip_cache
import server.lib.config as libconfig
from server.lib.feature_flags import is_feature_enabled
from server.lib.feature_flags import USE_V2_API
from server.routes import TIMEOUT
from server.services.discovery import get_health_check_urls
from server.services.discovery import get_service_url
from shared.lib.constants import MIXER_RESPONSE_ID_FIELD
from shared.lib.constants import MIXER_RESPONSE_ID_HEADER
from shared.lib.constants import PLACE_TYPE_RANK
from shared.lib.constants import SURFACE_HEADER_NAME
from shared.lib.constants import UNKNOWN_SURFACE

cfg = libconfig.get_config()
logger = logging.getLogger(__name__)


def get_basic_request_headers() -> dict:
  headers = {
      "Content-Type": "application/json",
      SURFACE_HEADER_NAME: UNKNOWN_SURFACE
  }

  if has_app_context():
    headers["x-api-key"] = current_app.config.get("DC_API_KEY", "")

  if has_request_context():
    # Represents the DC surface (website, web components, etc.) where the call originates
    # Used in mixer's usage logs
    headers[SURFACE_HEADER_NAME] = request.headers.get(SURFACE_HEADER_NAME,
                                                       UNKNOWN_SURFACE)

  return headers


# Log the mixer response IDs to capture this call to mixer in the mixer usage logs
@memoize_and_log_mixer_usage(timeout=TIMEOUT, unless=should_skip_cache)
def get(url: str):
  headers = get_basic_request_headers()
  # Send the request and verify the request succeeded
  call_logger = log.ExtremeCallLogger()
  response = requests.get(url, headers=headers)
  call_logger.finish(response)
  if response.status_code != 200:
    raise ValueError(
        "An HTTP {} code ({}) was returned by the mixer:\n{}".format(
            response.status_code, response.reason,
            response.json()["message"]))
  res_json = response.json()
  response_id = response.headers.get(MIXER_RESPONSE_ID_HEADER)
  # This is used to log cached and uncached mixer usage and is a list to be compatible with other cachable
  # objects that include multiple mixer responses.
  if response_id:
    res_json[MIXER_RESPONSE_ID_FIELD] = [response_id]
  return res_json


def post(url: str, req: Dict):

  # Get json string so the request can be flask cached.
  # Also to have deterministic req string, the repeated fields in request
  # are sorted.
  req_str = json.dumps(req, sort_keys=True)
  return post_wrapper(url, req_str)


# Log the mixer response IDs to capture this call to mixer in the mixer usage logs
@memoize_and_log_mixer_usage(timeout=TIMEOUT, unless=should_skip_cache)
def post_wrapper(url, req_str: str, headers_str: str | None = None):

  req = json.loads(req_str)
  headers = get_basic_request_headers()

  # Send the request and verify the request succeeded
  call_logger = log.ExtremeCallLogger(req, url=url)
  response = requests.post(url, json=req, headers=headers)
  call_logger.finish(response)

  if response.status_code != 200:
    raise ValueError(
        "An HTTP {} code ({}) was returned by the mixer:\n{}".format(
            response.status_code, response.reason,
            response.json()["message"]))
  res_json = response.json()
  response_id = response.headers.get(MIXER_RESPONSE_ID_HEADER)
  # This is used to log cached mixer usage and is a list to be compatible with other cached
  # objects that include multiple mixer responses.
  if response_id:
    res_json[MIXER_RESPONSE_ID_FIELD] = [response_id]
  return res_json


def obs_point(entities, variables, date="LATEST"):
  """Gets the observation point for the given entities of the given variable.

    Args:
        entities: A list of entities DCIDs.
        variables: A list of statistical variables.
        date (optional): The date of the observation. If not set, the latest
            observation is returned.
    """
  url = get_service_url("/v2/observation")
  return post(
      url, {
          "select": ["date", "value", "variable", "entity"],
          "entity": {
              "dcids": sorted(entities)
          },
          "variable": {
              "dcids": sorted(variables)
          },
          "date": date,
      })


def obs_point_within(parent_entity,
                     child_type,
                     variables,
                     date="LATEST",
                     facet_ids=None):
  """Gets the statistical variable values for child places of a certain place
      type contained in a parent place at a given date.

    Args:
        parent_entity: Parent place DCID as a string.
        child_type: Type of child places as a string.
        variables: List of statistical variable DCIDs each as a string.
        date (optional): Date as a string of the form YYYY-MM-DD where MM and DD are optional.

    Returns:
        Dict with a key "facets" and a key "byVariable".
        The value for "facets" is a dict keyed by facet ids, with dicts as values
        (See "StatMetadata" in https://github.com/datacommonsorg/mixer/blob/master/proto/stat.proto for the definition of the inner dicts)
        The value for "byVariable" is a list of dicts containing observations.

    """
  url = get_service_url("/v2/observation")
  req = {
      "select": ["date", "value", "variable", "entity"],
      "entity": {
          "expression":
              "{0}<-containedInPlace+{{typeOf:{1}}}".format(
                  parent_entity, child_type)
      },
      "variable": {
          "dcids": sorted(variables)
      },
      "date": date,
  }
  if facet_ids:
    req["filter"] = {"facetIds": facet_ids}
  return post(url, req)


def obs_series(entities, variables, facet_ids=None):
  """Gets the observation time series for the given entities of the given
    variable.

    Args:
        entities: A list of entities DCIDs.
        variables: A list of statistical variables.
    """
  url = get_service_url("/v2/observation")
  req = {
      "select": ["date", "value", "variable", "entity"],
      "entity": {
          "dcids": sorted(entities)
      },
      "variable": {
          "dcids": sorted(variables)
      },
  }
  if facet_ids:
    req["filter"] = {"facetIds": facet_ids}
  return post(url, req)


def obs_series_within(parent_entity, child_type, variables, facet_ids=None):
  """Gets the statistical variable series for child places of a certain place
      type contained in a parent place.

    Args:
        parent_entity: Parent entity DCID as a string.
        child_type: Type of child places as a string.
        variables: List of statistical variable DCIDs each as a string.
    """
  url = get_service_url("/v2/observation")
  req = {
      "select": ["date", "value", "variable", "entity"],
      "entity": {
          "expression":
              "{0}<-containedInPlace+{{typeOf:{1}}}".format(
                  parent_entity, child_type)
      },
      "variable": {
          "dcids": sorted(variables)
      },
  }
  if facet_ids:
    req["filter"] = {"facetIds": facet_ids}

  return post(url, req)


def series_facet(entities, variables):
  """Gets facet of time series for the given entities and variables.

    Args:
        entities: A list of entity DCIDs.
        variables: A list of statistical variable DCIDs.
    """
  url = get_service_url("/v2/observation")
  return post(
      url, {
          "select": ["variable", "entity", "facet"],
          "entity": {
              "dcids": sorted(entities)
          },
          "variable": {
              "dcids": sorted(variables)
          },
      })


def point_within_facet(parent_entity, child_type, variables, date):
  """Gets facet of for child places of a certain place type contained in a
    parent place at a given date.
  """
  url = get_service_url("/v2/observation")
  return post(
      url, {
          "select": ["variable", "entity", "facet"],
          "entity": {
              "expression":
                  "{0}<-containedInPlace+{{typeOf:{1}}}".format(
                      parent_entity, child_type)
          },
          "variable": {
              "dcids": sorted(variables)
          },
          "date": date,
      })


def v2observation(select, entity, variable, filter=None):
  """
    Args:
      select: A list of select props.
      entity: A dict in the form of {'dcids':, 'expression':}
      variable: A dict in the form of {'dcids':, 'expression':}
      filter: Optional dict in the form of {'facetIds': [...]} etc.
    """
  # Remove None from dcids and sort them. Note do not sort in place to avoid
  # changing the original input.
  if "dcids" in entity:
    entity["dcids"] = sorted([x for x in entity["dcids"] if x])
  if "dcids" in variable:
    variable["dcids"] = sorted([x for x in variable["dcids"] if x])
  url = get_service_url("/v2/observation")
  req = {
      "select": select,
      "entity": entity,
      "variable": variable,
  }
  if filter:
    req["filter"] = filter
  return post(url, req)


def v2node(nodes, prop):
  """Wrapper to call V2 Node REST API.

    Args:
        nodes: A list of node dcids.
        prop: The property to query for.
    """
  return post(
      get_service_url("/v2/node"),
      {
          "nodes": sorted(nodes),
          "property": prop,
      },
  )


def _merge_v2node_response(result, paged_response):
  if not result:
    result.update(paged_response)
    return

  for dcid in paged_response.get("data", {}):
    # Initialize dcid in data even when no arcs or properties are returned
    merged_result_for_dcid = result.setdefault("data", {}).setdefault(dcid, {})

    for prop in paged_response["data"][dcid].get("arcs", {}):
      merged_property_values_for_dcid = (merged_result_for_dcid.setdefault(
          "arcs", {}).setdefault(prop, {}).setdefault("nodes", []))
      merged_property_values_for_dcid.extend(
          paged_response["data"][dcid]["arcs"][prop].get("nodes", []))

    if "properties" in paged_response["data"][dcid]:
      merged_properties_for_dcid = merged_result_for_dcid.setdefault(
          "properties", [])
      merged_properties_for_dcid.extend(paged_response["data"][dcid].get(
          "properties", []))

  result["nextToken"] = paged_response.get("nextToken", "")
  if not result["nextToken"]:
    del result["nextToken"]


def v2node_paginated(nodes, prop, max_pages=1):
  """Wrapper to call V2 Node REST API.

    Args:
        nodes: A list of node dcids.
        prop: The property to query for.
        max_pages: The maximum number of pages to fetch. If None, v2node is
          queried until nextToken is not in the response.
    """
  fetched_pages = 0
  result = {}
  next_token = ""
  url = get_service_url("/v2/node")
  while True:
    response = post(url, {
        "nodes": sorted(nodes),
        "property": prop,
        "nextToken": next_token
    })
    _merge_v2node_response(result, response)
    fetched_pages += 1
    next_token = response.get("nextToken", "")
    if not next_token or (max_pages and fetched_pages >= max_pages):
      break
  return result


def v2event(node, prop):
  """Wrapper to call V2 Event REST API.

    Args:
        node: The node dcid of which event data is queried.
        prop: Property expression to filter the event.
    """
  url = get_service_url("/v2/event")
  return post(url, {"node": node, "property": prop})


def get_variable_group_info(nodes: List[str],
                            entities: List[str],
                            numEntitiesExistence=1,
                            include_definitions=False) -> Dict:
  """Gets the stat var group node information."""
  use_v2 = is_feature_enabled(USE_V2_API, app=current_app, request=request)
  if use_v2:
    url = get_service_url("/v2/bulk/info/variable-group")
  else:
    url = get_service_url("/v1/bulk/info/variable-group")
  req_dict = {
      "nodes": nodes,
      "constrained_entities": entities,
      "num_entities_existence": numEntitiesExistence,
  }
  if use_v2 and include_definitions:
    req_dict["includeDefinitions"] = True
  return post(url, req_dict)


def variable_info(nodes: List[str]) -> Dict:
  """Gets the stat var node information."""
  if is_feature_enabled(USE_V2_API, app=current_app, request=request):
    url = get_service_url("/v2/bulk/info/variable")
  else:
    url = get_service_url("/v1/bulk/info/variable")
  req_dict = {"nodes": nodes}
  return post(url, req_dict)


def _get_variable_ancestors_v1(dcid: str):
  """Gets the path of a stat var to the root of the stat var hierarchy using v1/variable/ancestors."""
  url = get_service_url("/v1/variable/ancestors")
  url = f"{url}/{dcid}"
  return get(url).get("ancestors", [])


def _get_variable_ancestors_v2(dcid: str):
  """Gets the path of a stat var to the root of the stat var hierarchy using v2 node."""
  ancestors = []
  curr = dcid
  visited = {dcid}
  max_depth = 20
  while len(ancestors) < max_depth:
    # Trace the hierarchy using both StatisticalVariable groupings (memberOf)
    # and StatVarGroup specializations (specializationOf).
    resp = v2node([curr], "->[memberOf,specializationOf]")
    arcs = resp.get("data", {}).get(curr, {}).get("arcs", {})

    parents_data = (arcs.get("memberOf", {}).get("nodes", []) +
                    arcs.get("specializationOf", {}).get("nodes", []))

    if not parents_data:
      break

    parent_dcids = sorted(
        list(set(p["dcid"] for p in parents_data if "dcid" in p)))
    if not parent_dcids:
      break

    # Tie-breaking logic:
    # 1. Prefer the first dc/g/Custom_ prefix
    # 2. Otherwise take the first alphabetically
    selected_parent = next(
        (p for p in parent_dcids if p.startswith("dc/g/Custom_")),
        parent_dcids[0])

    if selected_parent == "dc/g/Root":
      break

    if selected_parent in visited:
      logger.error(f"Cycle detected in StatVar hierarchy at {selected_parent}")
      break

    ancestors.append(selected_parent)
    visited.add(selected_parent)
    curr = selected_parent

  return ancestors


@cache.memoize(timeout=TIMEOUT, unless=should_skip_cache)
def get_variable_ancestors(dcid: str):
  """Gets the path of a stat var to the root of the stat var hierarchy."""
  if is_feature_enabled(USE_V2_API):
    return _get_variable_ancestors_v2(dcid)
  else:
    return _get_variable_ancestors_v1(dcid)


def _get_all_values(resp, dcid, prop, key='dcid'):
  """Retrieves all values for a given property from the v2node response."""
  node_data = resp.get('data', {}).get(dcid, {})
  arcs_obj = node_data.get('arcs', {}).get(prop, {})
  if not arcs_obj:
    # Try checking without arrow if key mismatch
    arcs_obj = node_data.get('arcs', {}).get(prop.replace('->', ''), {})

  nodes_list = arcs_obj.get('nodes', []) if isinstance(arcs_obj, dict) else []
  return [n.get(key, '') for n in nodes_list if key in n]


def _get_best_type(types_list):
  """Selects the best type from a list of types based on PLACE_TYPE_RANK."""
  if not types_list:
    return ''

  # Sort types by rank (highest rank first)
  # If ranks are tied, prefer types that don't start with 'AdministrativeArea'
  def sort_key(t):
    rank = PLACE_TYPE_RANK.get(t, 0)
    is_admin = 1 if t.startswith('AdministrativeArea') else 0
    return (rank, -is_admin)

  return sorted(types_list, key=sort_key, reverse=True)[0]


def get_place_info(dcids: List[str]) -> Dict:
  """Retrieves Place Info given a list of DCIDs."""
  # Get ancestors using BFS since v2/node doesn't support recursive ->containedInPlace+
  ancestors_map = {dcid: set() for dcid in dcids}

  parent_graph = {}  # child_dcid -> list of parent_dcids
  frontier = set(dcids)
  visited = set()

  # BFS to build parent graph (max depth 10)
  max_ancestor_depth = 10
  for _ in range(max_ancestor_depth):
    if not frontier:
      break

    # Filter visited nodes to avoid cycles
    fetch_dcids = [d for d in frontier if d not in visited]
    if not fetch_dcids:
      break

    # Fetch immediate parents for current batch of nodes
    resp = v2node(fetch_dcids, '->containedInPlace')
    data = resp.get('data', {})

    current_frontier = set()
    for dcid in fetch_dcids:
      visited.add(dcid)
      node_data = data.get(dcid, {})

      # Extract parents for each node in the current frontier
      arcs_obj = node_data.get('arcs', {}).get('containedInPlace', {})
      nodes_list = arcs_obj.get('nodes', []) if isinstance(arcs_obj,
                                                           dict) else []

      parents = [x['dcid'] for x in nodes_list if 'dcid' in x]
      if parents:
        parent_graph[dcid] = parents
        # Add new parents to the next frontier for recursive BFS
        current_frontier.update(parents)

    frontier = current_frontier

  # Build ancestors list from the graph using the discovered parent relationships
  for dcid in dcids:
    queue = collections.deque([dcid])
    seen = {dcid}
    while queue:
      curr = queue.popleft()
      parents = parent_graph.get(curr, [])
      for p in parents:
        if p not in seen:
          seen.add(p)
          # Add to ancestors if it's not the node itself
          if p != dcid:
            ancestors_map[dcid].add(p)
          queue.append(p)

  all_dcids = set()
  for anc_set in ancestors_map.values():
    all_dcids.update(anc_set)
  all_dcids.update(dcids)

  all_dcids_list = sorted(all_dcids)
  if not all_dcids_list:
    return {'data': []}

  # Batch fetch types and names for all discovered nodes to minimize API calls
  types_resp = v2node(all_dcids_list, '->typeOf')
  names_resp = v2node(all_dcids_list, '->name')

  result_data = []
  for dcid in dcids:
    # Use helper functions to extract specific properties from batch response
    self_types = _get_all_values(types_resp, dcid, 'typeOf')
    self_names = _get_all_values(names_resp, dcid, 'name', 'value')

    # Skip DCIDs that don't exist in the graph (bogus places)
    if not self_types and not self_names:
      continue

    self_type = _get_best_type(self_types)
    self_name = self_names[0] if self_names else ''

    parents = []
    for anc_dcid in ancestors_map.get(dcid, []):
      if anc_dcid == dcid:
        continue

      anc_types = _get_all_values(types_resp, anc_dcid, 'typeOf')
      anc_type = _get_best_type(anc_types)
      anc_names = _get_all_values(names_resp, anc_dcid, 'name', 'value')
      anc_name = anc_names[0] if anc_names else ''

      # Filter and collect parent information based on recognized place types
      if anc_type in PLACE_TYPE_RANK:
        parents.append({
            'dcid': anc_dcid,
            'type': anc_type,
            'name': anc_name,
            'rank': PLACE_TYPE_RANK[anc_type]
        })

    # Sort parents by rank to establish a consistent geographical hierarchy (smaller places first)
    parents.sort(key=lambda x: x['rank'])
    for p in parents:
      del p['rank']

    result_data.append({
        'node': dcid,
        'info': {
            'self': {
                'dcid': dcid,
                'type': self_type,
                'name': self_name
            },
            'parents': parents
        }
    })

  return {'data': result_data}


def get_series_dates(parent_entity, child_type, variables):
  """Get series dates."""
  # Get children recursively with type filter from the V2 API
  children_resp = v2node([parent_entity],
                         f'<-containedInPlace+{{typeOf:{child_type}}}')

  node_data = children_resp.get('data', {}).get(parent_entity, {})
  # V2 response key for recursion includes the + but not the filter
  arcs_obj = node_data.get('arcs', {}).get('containedInPlace+', {})
  nodes_list = arcs_obj.get('nodes', []) if isinstance(arcs_obj, dict) else []
  child_dcids = [x['dcid'] for x in nodes_list if 'dcid' in x]

  if not child_dcids:
    return {"datesByVariable": [], "facets": {}}

  # Get observation dates for the filtered children using batch V2 API
  # We select essential fields: date, value, variable, entity (place), and facet
  obs_resp = v2observation(
      select=['date', 'variable', 'entity', 'facet', 'value'],
      entity={'dcids': child_dcids},
      variable={'dcids': variables})

  # Aggregate results to count how many entities have data for each date/variable combination
  # Structure: { variable: { date: { facet: count } } }
  agg_data = collections.defaultdict(
      lambda: collections.defaultdict(lambda: collections.defaultdict(int)))

  # Process observation response and populate the aggregate map
  by_var = obs_resp.get('byVariable', {})
  all_facets = obs_resp.get('facets', {})

  for var, var_data in by_var.items():
    by_ent = var_data.get('byEntity', {})
    for _, ent_data in by_ent.items():
      # the observations are found inside ordered facets
      ordered_facets = ent_data.get('orderedFacets', [])
      for facet_obj in ordered_facets:
        facet_id = str(facet_obj.get('facetId', ''))
        observations = facet_obj.get('observations', [])

        for obs in observations:
          date = obs.get('date')
          if not date:
            continue

          # Facet handling
          agg_data[var][date][facet_id] += 1

  # Final pass to construct the response format expected by the frontend
  resp_dates = []
  for var, dates_map in agg_data.items():
    obs_dates = []
    for date, facet_counts in dates_map.items():
      entity_counts = []
      for facet_id, count in facet_counts.items():
        entity_counts.append({"count": count, "facet": facet_id})
      obs_dates.append({"date": date, "entityCount": entity_counts})
    obs_dates.sort(key=lambda x: x['date'])
    resp_dates.append({"variable": var, "observationDates": obs_dates})

  return {"datesByVariable": resp_dates, "facets": all_facets}


def resolve(nodes, prop, resolver="place"):
  """Resolves nodes based on the given property.

    Args:
        nodes: A list of node dcids.
        prop: Property expression indicating the property to resolve.
        resolver: The resolver to use (default: "place").
    """
  url = get_service_url("/v2/resolve")
  return post(url, {"nodes": nodes, "property": prop, "resolver": resolver})


def nl_search_vars(
    queries,
    index_types: List[str],
    reranker="",
    skip_topics="",
):
  """Search sv from NL server."""
  idx_params = ",".join(index_types)
  nl_root = current_app.config["NL_ROOT"]
  url = f"{nl_root}/api/search_vars?idx={idx_params}"
  if reranker:
    url = f"{url}&reranker={reranker}"
  if skip_topics:
    url = f"{url}&skip_topics={skip_topics}"
  return post(url, {"queries": queries})


async def nl_search_vars_in_parallel(
    queries: list[str],
    index_types: list[str],
    skip_topics: bool = False) -> dict[str, dict]:
  """Search sv from NL server in parallel for multiple indexes.

    Args:
        queries: A list of query strings.
        index_types: A list of index names to query.
        skip_topics: A boolean to skip topic-based SVs.

    Returns:
        A dictionary mapping from index name to the search result from that index.
    """

  async def search_for_index(index):
    result = await asyncio.to_thread(
        nl_search_vars,
        queries=queries,
        index_types=[index],
        skip_topics="true" if skip_topics else "",
    )
    return index, result

  tasks = [search_for_index(index) for index in index_types]
  results = await asyncio.gather(*tasks)
  return {index: result for index, result in results}


def nl_detect_verbs(query):
  """Detect verbs from NL server."""
  url = f"{current_app.config['NL_ROOT']}/api/detect_verbs?q={query}"
  return get(url)


def nl_encode(model, queries):
  """Encode queries from NL server."""
  url = f"{current_app.config['NL_ROOT']}/api/encode"
  return post(url, {"model": model, "queries": queries})


def nl_server_config():
  return get(f"{current_app.config['NL_ROOT']}/api/server_config")


# =======================   V0 V0 V0 ================================
def translate(sparql, mapping):
  url = get_service_url("/translate")
  return post(url, {"schema_mapping": mapping, "sparql": sparql})


def version():
  """Returns the version of mixer.

    Currently all service groups must have the same version.
    """
  url = get_health_check_urls()[0]
  return get(url)


def place_ranking(variable, descendent_type, ancestor=None, per_capita=False):
  url = get_service_url("/v1/place/ranking")
  return post(
      url,
      {
          "stat_var_dcids": [variable],
          "place_type": descendent_type,
          "within_place": ancestor,
          "is_per_capita": per_capita,
      },
  )


def related_place(dcid, variables, ancestor=None, per_capita=False):
  url = get_service_url("/v1/place/related")
  req_json = {"dcid": dcid, "stat_var_dcids": sorted(variables)}
  if ancestor:
    req_json["within_place"] = ancestor
  if per_capita:
    req_json["is_per_capita"] = per_capita
  return post(url, req_json)


def recognize_places(query):
  if is_feature_enabled(USE_V2_API, app=current_app, request=request):
    url = get_service_url("/v2/recognize/places")
  else:
    url = get_service_url("/v1/recognize/places")
  resp = post(url, {"queries": [query]})
  return resp.get("queryItems", {}).get(query, {}).get("items", [])


def recognize_entities(query):
  url = get_service_url("/v1/recognize/entities")
  resp = post(url, {"queries": [query]})
  return resp.get("queryItems", {}).get(query.lower(), {}).get("items", [])


def find_entities(places: list[str]) -> dict[str, list[str]]:
  """Resolves a list of place names to their corresponding Data Commons DCIDs."""
  resp = resolve(places, "<-description->dcid")

  retval = {p: [] for p in places}

  for ent in resp.get("entities", []):
    node = ent.get("node")

    # A check to make sure that the node returned was in our initial request
    if node in retval:
      dcids = [
          dcid for c in ent.get("candidates", []) if (dcid := c.get("dcid"))
      ]
      if dcids:
        retval[node] = dcids

  return retval


def search_statvar(query, places, sv_only):
  url = get_service_url("/v1/variable/search")
  return post(
      url,
      {
          "query": query,
          "places": places,
          "sv_only": sv_only,
      },
  )


def filter_statvars(stat_vars, entities):
  url = get_service_url("/v2/variable/filter")
  return post(
      url,
      {
          "stat_vars": stat_vars,
          "entities": entities,
      },
  )


def safe_obs_point(entities, variables, date='LATEST'):
  """
    Calls obs_point with error handling.
    If an error occurs, returns a dict with an empty byVariable key.
    """
  try:
    return obs_point(entities, variables, date)
  except Exception as e:
    logger.error(f"Error in obs_point call: {str(e)}", exc_info=True)
    return {"byVariable": {}}


def safe_obs_point_within(parent_entity,
                          child_type,
                          variables,
                          date='LATEST',
                          facet_ids=None):
  """
  Calls obs_point_within with error handling.
  If an error occurs, returns a dict with an empty byVariable key.
  """
  try:
    return obs_point_within(parent_entity, child_type, variables, date,
                            facet_ids)
  except Exception as e:
    logger.error(f"Error in obs_point_within call: {str(e)}", exc_info=True)
    return {"byVariable": {}}
