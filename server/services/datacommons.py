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
from itertools import groupby
import json
import logging
from operator import itemgetter
from typing import Dict, List, Set
import urllib.parse

from flask import current_app
from flask import has_app_context
from flask import has_request_context
from flask import request
import requests

from server.lib import log
from server.lib.cache import memoize_and_log_mixer_usage
from server.lib.cache import should_skip_cache
import server.lib.config as libconfig
from server.routes import TIMEOUT
from server.services.discovery import get_health_check_urls
from server.services.discovery import get_service_url
from shared.lib import constants
from shared.lib.constants import MIXER_RESPONSE_ID_FIELD
from shared.lib.constants import MIXER_RESPONSE_ID_HEADER
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


def v2observation(select, entity, variable):
  """
    Args:
      select: A list of select props.
      entity: A dict in the form of {'dcids':, 'expression':}
      variable: A dict in the form of {'dcids':, 'expression':}

    """
  # Remove None from dcids and sort them. Note do not sort in place to avoid
  # changing the original input.
  if "dcids" in entity:
    entity["dcids"] = sorted([x for x in entity["dcids"] if x])
  if "dcids" in variable:
    variable["dcids"] = sorted([x for x in variable["dcids"] if x])
  url = get_service_url("/v2/observation")
  return post(url, {
      "select": select,
      "entity": entity,
      "variable": variable,
  })


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


def _extract_place_info(node_response_item: Dict) -> Dict:
  """Extracts place info (name, type) from a V2 Node response item."""
  info = {}
  # Extract name
  if "name" in node_response_item.get("properties", {}):
    info["name"] = node_response_item["properties"]["name"][0]

  # Extract type
  if "typeOf" in node_response_item.get("arcs", {}):
    types = node_response_item["arcs"]["typeOf"].get("nodes", [])
    if types:
      # Prefer a type that is in our rank map, else take the first one
      chosen_type = types[0].get("dcid", "")
      for t in types:
        t_dcid = t.get("dcid", "")
        if t_dcid in constants.PLACE_TYPE_RANK:
          chosen_type = t_dcid
          break
      info["type"] = chosen_type
  return info


def get_place_info(place_dcids: List[str]) -> Dict:
  """Retrieves Place Info given a list of DCIDs."""
  
  # Step 1: Fetch details for the requested nodes
  place_node_resp = v2node(place_dcids, "->[name, typeOf, containedInPlace]")

  # Intermediate storage
  place_hierarchy_map = {}
  unique_parent_dcids = set()

  if "data" in place_node_resp:
    for dcid, data in place_node_resp["data"].items():
      info = {"self": _extract_place_info(data), "parents": []}

      # Extract parents
      parents = []
      if "containedInPlace" in data.get("arcs", {}):
        for node in data["arcs"]["containedInPlace"].get("nodes", []):
          p_dcid = node.get("dcid")
          if p_dcid:
            parents.append(p_dcid)
            unique_parent_dcids.add(p_dcid)

      place_hierarchy_map[dcid] = {"info": info, "parent_dcids": parents}

  # Step 2: Fetch details for all parents
  parent_info_map = {}
  if unique_parent_dcids:
    parent_node_resp = v2node(list(unique_parent_dcids), "->[name, typeOf]")
    if "data" in parent_node_resp:
      for dcid, data in parent_node_resp["data"].items():
        p_info = _extract_place_info(data)
        p_info["dcid"] = dcid
        parent_info_map[dcid] = p_info

  # Step 3: Construct the final response
  result_data = []
  for dcid in place_dcids:
    if dcid in place_hierarchy_map:
      entry = {"node": dcid, "info": place_hierarchy_map[dcid]["info"]}

      # Populate parents list
      parents_list = []
      for p_dcid in place_hierarchy_map[dcid]["parent_dcids"]:
        if p_dcid in parent_info_map:
          parents_list.append(parent_info_map[p_dcid])

      # Sort parents
      entry["info"]["parents"] = sorted(
          parents_list,
          key=lambda x: constants.PLACE_TYPE_RANK.get(x.get("type", ""), 100))

      result_data.append(entry)

  return {"data": result_data}


def get_variable_group_info(nodes: List[str],
                            entities: List[str],
                            numEntitiesExistence=1) -> Dict:
  """Gets the stat var group node information."""
  url = get_service_url("/v1/bulk/info/variable-group")
  req_dict = {
      "nodes": nodes,
      "constrained_entities": entities,
      "num_entities_existence": numEntitiesExistence,
  }
  return post(url, req_dict)


def variable_info(nodes: List[str]) -> Dict:
  """Gets the stat var node information."""
  url = get_service_url("/v1/bulk/info/variable")
  req_dict = {"nodes": nodes}
  return post(url, req_dict)


def get_variable_ancestors(dcid: str):
  """Gets the path of a stat var to the root of the stat var hierarchy."""
  url = get_service_url("/v1/variable/ancestors")
  url = f"{url}/{dcid}"
  return get(url).get("ancestors", [])


def _process_variable_dates(variable_dcid: str,
                            variable_observation_data: Dict) -> Dict:
  """Aggregates observation counts for a single variable from V2 response."""
  # Pivot: Entity -> Date -> Facet  TO  Date -> Facet -> Count
  counts_by_date_and_facet = collections.defaultdict(
      lambda: collections.defaultdict(int))

  by_entity = variable_observation_data.get("byEntity", {})
  for entity, entity_data in by_entity.items():
    for facet_item in entity_data.get("orderedFacets", []):
      facet_id = facet_item.get("facetId")
      for obs in facet_item.get("observations", []):
        date = obs.get("date")
        if date:
          counts_by_date_and_facet[date][facet_id] += 1

  # Convert to list format
  obs_dates = []
  for date in sorted(counts_by_date_and_facet.keys()):
    entity_counts = []
    # Sort by facet_id for deterministic order
    for facet_id in sorted(counts_by_date_and_facet[date].keys()):
      count = counts_by_date_and_facet[date][facet_id]
      entity_counts.append({"facet": facet_id, "count": count})
    obs_dates.append({"date": date, "entityCount": entity_counts})

  return {"variable": variable_dcid, "observationDates": obs_dates}


def get_series_dates(parent_place_dcid, child_place_type, variable_dcids):
  """Get series dates."""
  # Fetch series data from V2
  url = get_service_url("/v2/observation")
  req = {
      "select": ["date", "variable", "entity"],
      "entity": {
          "expression":
              "{0}<-containedInPlace+{{typeOf:{1}}}".format(
                  parent_place_dcid, child_place_type)
      },
      "variable": {
          "dcids": sorted(variable_dcids)
      }
  }
  resp = post(url, req)

  # Aggregate counts locally
  observations_by_variable = resp.get("byVariable", {})
  facets = resp.get("facets", {})

  result_list = []
  # Sort by variable for deterministic order
  for var in sorted(observations_by_variable.keys()):
    data = observations_by_variable[var]
    result_list.append(_process_variable_dates(var, data))

  return {"datesByVariable": result_list, "facets": facets}


def resolve(nodes, prop):
  """Resolves nodes based on the given property.

    Args:
        nodes: A list of node dcids.
        prop: Property expression indicating the property to resolve.
    """
  url = get_service_url("/v2/resolve")
  return post(url, {"nodes": nodes, "property": prop})


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
def search(query_text, max_results):
  url = get_service_url("/search")
  query_text = urllib.parse.quote(query_text.replace(",", " "))
  url = f"{url}?query={query_text}&max_results={max_results}"
  response = requests.get(url)
  if response.status_code != 200:
    raise ValueError(
        "Response error: An HTTP {} code was returned by the mixer. "
        "Printing response\n{}".format(response.status_code, response.reason))
  return response.json()


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


def query(query_string):
  # Get the API Key and perform the POST request.
  logging.info("[ Mixer Request ]: \n" + query_string)
  url = get_service_url("/v2/sparql")
  resp = post(url, {"query": query_string})
  return resp["header"], resp.get("rows", [])


def related_place(dcid, variables, ancestor=None, per_capita=False):
  url = get_service_url("/v1/place/related")
  req_json = {"dcid": dcid, "stat_var_dcids": sorted(variables)}
  if ancestor:
    req_json["within_place"] = ancestor
  if per_capita:
    req_json["is_per_capita"] = per_capita
  return post(url, req_json)


def recognize_places(query):
  url = get_service_url("/v1/recognize/places")
  resp = post(url, {"queries": [query]})
  return resp.get("queryItems", {}).get(query, {}).get("items", [])


def recognize_entities(query):
  url = get_service_url("/v1/recognize/entities")
  resp = post(url, {"queries": [query]})
  return resp.get("queryItems", {}).get(query.lower(), {}).get("items", [])


def find_entities(places):
  url = get_service_url("/v1/bulk/find/entities")
  entities = [{"description": p} for p in places]
  resp = post(url, {"entities": entities})
  retval = {p: [] for p in places}
  for ent in resp.get("entities", []):
    if not ent.get("description") or not ent.get("dcids"):
      continue
    retval[ent["description"]] = ent["dcids"]
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
