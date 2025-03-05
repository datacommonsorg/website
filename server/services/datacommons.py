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

import json
import logging
from typing import Dict, List
import urllib.parse

from flask import current_app
import requests

from server.lib import log
from server.lib.cache import cache
import server.lib.config as libconfig
from server.routes import TIMEOUT
from server.services.discovery import get_health_check_urls
from server.services.discovery import get_service_url

MAX_SIZE_V2NODE_REQUEST = 7000

cfg = libconfig.get_config()


@cache.memoize(timeout=TIMEOUT)
def get(url: str):
  headers = {'Content-Type': 'application/json'}
  dc_api_key = current_app.config.get('DC_API_KEY', '')
  if dc_api_key:
    headers['x-api-key'] = dc_api_key
  # Send the request and verify the request succeeded
  call_logger = log.ExtremeCallLogger()
  response = requests.get(url, headers=headers)
  call_logger.finish(response)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer:\n{}'.format(
            response.status_code, response.reason,
            response.json()['message']))
  return response.json()


def post(url: str, req: Dict):
  # Get json string so the request can be flask cached.
  # Also to have deterministic req string, the repeated fields in request
  # are sorted.
  req_str = json.dumps(req, sort_keys=True)
  return post_wrapper(url, req_str)


@cache.memoize(timeout=TIMEOUT)
def post_wrapper(url, req_str: str):
  req = json.loads(req_str)
  headers = {'Content-Type': 'application/json'}
  dc_api_key = current_app.config.get('DC_API_KEY', '')
  if dc_api_key:
    headers['x-api-key'] = dc_api_key
  # Send the request and verify the request succeeded
  call_logger = log.ExtremeCallLogger(req)
  response = requests.post(url, json=req, headers=headers)
  call_logger.finish(response)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer:\n{}'.format(
            response.status_code, response.reason,
            response.json()['message']))
  return response.json()


def obs_point(entities, variables, date='LATEST'):
  """Gets the observation point for the given entities of the given variable.

  Args:
      entities: A list of entities DCIDs.
      variables: A list of statistical variables.
      date (optional): The date of the observation. If not set, the latest
          observation is returned.
  """
  url = get_service_url('/v2/observation')
  return post(
      url, {
          'select': ['date', 'value', 'variable', 'entity'],
          'entity': {
              'dcids': sorted(entities)
          },
          'variable': {
              'dcids': sorted(variables)
          },
          'date': date,
      })


def obs_point_within(parent_entity,
                     child_type,
                     variables,
                     date='LATEST',
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
  url = get_service_url('/v2/observation')
  req = {
      'select': ['date', 'value', 'variable', 'entity'],
      'entity': {
          'expression':
              '{0}<-containedInPlace+{{typeOf:{1}}}'.format(
                  parent_entity, child_type)
      },
      'variable': {
          'dcids': sorted(variables)
      },
      'date': date
  }
  if facet_ids:
    req['filter'] = {'facetIds': facet_ids}
  return post(url, req)


def obs_series(entities, variables, facet_ids=None):
  """Gets the observation time series for the given entities of the given
  variable.

  Args:
      entities: A list of entities DCIDs.
      variables: A list of statistical variables.
  """
  url = get_service_url('/v2/observation')
  req = {
      'select': ['date', 'value', 'variable', 'entity'],
      'entity': {
          'dcids': sorted(entities)
      },
      'variable': {
          'dcids': sorted(variables)
      },
  }
  if facet_ids:
    req['filter'] = {'facetIds': facet_ids}
  return post(url, req)


def obs_series_within(parent_entity, child_type, variables, facet_ids=None):
  """Gets the statistical variable series for child places of a certain place
    type contained in a parent place.

  Args:
      parent_entity: Parent entity DCID as a string.
      child_type: Type of child places as a string.
      variables: List of statistical variable DCIDs each as a string.
  """
  url = get_service_url('/v2/observation')
  req = {
      'select': ['date', 'value', 'variable', 'entity'],
      'entity': {
          'expression':
              '{0}<-containedInPlace+{{typeOf:{1}}}'.format(
                  parent_entity, child_type)
      },
      'variable': {
          'dcids': sorted(variables)
      },
  }
  if facet_ids:
    req['filter'] = {'facetIds': facet_ids}
  return post(url, req)


def series_facet(entities, variables):
  """Gets facet of time series for the given entities and variables.

  Args:
      entities: A list of entity DCIDs.
      variables: A list of statistical variable DCIDs.
  """
  url = get_service_url('/v2/observation')
  return post(
      url, {
          'select': ['variable', 'entity', 'facet'],
          'entity': {
              'dcids': sorted(entities)
          },
          'variable': {
              'dcids': sorted(variables)
          },
      })


def point_within_facet(parent_entity, child_type, variables, date):
  """Gets facet of for child places of a certain place type contained in a
  parent place at a given date.
  """
  url = get_service_url('/v2/observation')
  return post(
      url, {
          'select': ['variable', 'entity', 'facet'],
          'entity': {
              'expression':
                  '{0}<-containedInPlace+{{typeOf:{1}}}'.format(
                      parent_entity, child_type)
          },
          'variable': {
              'dcids': sorted(variables)
          },
          'date': date
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
  if 'dcids' in entity:
    entity['dcids'] = sorted([x for x in entity['dcids'] if x])
  if 'dcids' in variable:
    variable['dcids'] = sorted([x for x in variable['dcids'] if x])
  url = get_service_url('/v2/observation')
  return post(url, {
      'select': select,
      'entity': entity,
      'variable': variable,
  })


def batch_requested_nodes(url, nodes, max_v2node_request_size):
  """
  Splits a list of dcids into batches that do not exceed the DC API request size limit.
  """
  full_request = url + "&".join([f'nodes={n}' for n in (nodes)])
  if len(full_request.encode('utf-8')) <= max_v2node_request_size:
    return [nodes]

  batches = []
  cur_batch = []
  for node in nodes:
    potential_request = url + "&".join(
        [f'nodes={n}' for n in cur_batch + [node]])
    if len(potential_request.encode('utf-8')) > max_v2node_request_size:
      batches.append(cur_batch)
      cur_batch = []
    cur_batch.append(node)

  if cur_batch:
    batches.append(cur_batch)
  return batches


def v2node(nodes, prop):
  """Wrapper to call V2 Node REST API.

  Args:
      nodes: A list of node dcids.
      prop: The property to query for.
  """
  response = {}
  url = get_service_url('/v2/node')
  for batch in batch_requested_nodes(url, nodes, MAX_SIZE_V2NODE_REQUEST):
    response.update(post(url, {
        'nodes': sorted(batch),
        'property': prop,
    }))
  return response


def _merge_v2node_response(result, paged_response):
  for dcid in paged_response.get('data', {}):
    # Initialize dcid in data even when no arcs or properties are returned
    merged_result_for_dcid = result.setdefault('data', {}).setdefault(dcid, {})

    for prop in paged_response['data'][dcid].get('arcs', {}):
      merged_property_values_for_dcid = merged_result_for_dcid.setdefault(
          'arcs', {}).setdefault(prop, {}).setdefault('nodes', [])
      merged_property_values_for_dcid.extend(
          paged_response['data'][dcid]['arcs'][prop]['nodes'])

    if 'properties' in paged_response['data'][dcid]:
      merged_properties_for_dcid = merged_result_for_dcid.setdefault(
          'properties', [])
      merged_properties_for_dcid.extend(paged_response['data'][dcid].get(
          'properties', []))

  result['nextToken'] = paged_response.get('nextToken', '')
  if not result['nextToken']:
    del result['nextToken']


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
  next_token = ''
  url = get_service_url('/v2/node')
  for node_batch in batch_requested_nodes(url, nodes, MAX_SIZE_V2NODE_REQUEST):
    while True:

      response = post(url, {
          'nodes': sorted(node_batch),
          'property': prop,
          'nextToken': next_token
      })
      _merge_v2node_response(result, response)
      fetched_pages += 1
      next_token = response.get('nextToken', '')
      if not next_token or (max_pages and fetched_pages >= max_pages):
        break
  return result


def v2event(node, prop):
  """Wrapper to call V2 Event REST API.

  Args:
      node: The node dcid of which event data is queried.
      prop: Property expression to filter the event.
  """
  url = get_service_url('/v2/event')
  return post(url, {'node': node, 'property': prop})


def get_place_info(dcids: List[str]) -> Dict:
  """Retrieves Place Info given a list of DCIDs."""
  url = get_service_url('/v1/bulk/info/place')
  return post(f'{url}', {'nodes': sorted(set(dcids))})


def get_variable_group_info(nodes: List[str],
                            entities: List[str],
                            numEntitiesExistence=1) -> Dict:
  """Gets the stat var group node information."""
  url = get_service_url('/v1/bulk/info/variable-group')
  req_dict = {
      "nodes": nodes,
      "constrained_entities": entities,
      "num_entities_existence": numEntitiesExistence
  }
  return post(url, req_dict)


def variable_info(nodes: List[str]) -> Dict:
  """Gets the stat var node information."""
  url = get_service_url('/v1/bulk/info/variable')
  req_dict = {"nodes": nodes}
  return post(url, req_dict)


def get_variable_ancestors(dcid: str):
  """Gets the path of a stat var to the root of the stat var hierarchy."""
  url = get_service_url('/v1/variable/ancestors')
  url = f'{url}/{dcid}'
  return get(url).get('ancestors', [])


def get_series_dates(parent_entity, child_type, variables):
  """Get series dates."""
  url = get_service_url('/v1/bulk/observation-dates/linked')
  return post(
      url, {
          'linked_property': "containedInPlace",
          'linked_entity': parent_entity,
          'entity_type': child_type,
          'variables': variables,
      })


def bio(entity):
  """Fetch biology subgraph linking to the given entity"""
  url = get_service_url('/v1/internal/page/bio')
  return get(url + "/" + entity)


def resolve(nodes, prop):
  """Resolves nodes based on the given property.

  Args:
      nodes: A list of node dcids.
      prop: Property expression indicating the property to resolve.
  """
  url = get_service_url('/v2/resolve')
  return post(url, {'nodes': nodes, 'property': prop})


def nl_search_vars(queries, index_types: List[str], reranker=''):
  """Search sv from NL server."""
  idx_params = ','.join(index_types)
  url = f'{current_app.config["NL_ROOT"]}/api/search_vars?idx={idx_params}'
  if reranker:
    url = f'{url}&reranker={reranker}'
  return post(url, {'queries': queries})


def nl_detect_verbs(query):
  """Detect verbs from NL server."""
  url = f'{current_app.config["NL_ROOT"]}/api/detect_verbs?q={query}'
  return get(url)


def nl_encode(model, queries):
  """Encode queries from NL server."""
  url = f'{current_app.config["NL_ROOT"]}/api/encode'
  return post(url, {'model': model, 'queries': queries})


def nl_server_config():
  return get(f'{current_app.config["NL_ROOT"]}/api/server_config')


# =======================   V0 V0 V0 ================================
def search(query_text, max_results):
  url = get_service_url('/search')
  query_text = urllib.parse.quote(query_text.replace(',', ' '))
  url = f'{url}?query={query_text}&max_results={max_results}'
  response = requests.get(url)
  if response.status_code != 200:
    raise ValueError(
        'Response error: An HTTP {} code was returned by the mixer. '
        'Printing response\n{}'.format(response.status_code, response.reason))
  return response.json()


def translate(sparql, mapping):
  url = get_service_url('/translate')
  return post(url, {'schema_mapping': mapping, 'sparql': sparql})


def version():
  """Returns the version of mixer.

  Currently all service groups must have the same version.
  """
  url = get_health_check_urls()[0]
  return get(url)


def place_ranking(variable, descendent_type, ancestor=None, per_capita=False):
  url = get_service_url('/v1/place/ranking')
  return post(
      url, {
          'stat_var_dcids': [variable],
          'place_type': descendent_type,
          'within_place': ancestor,
          'is_per_capita': per_capita,
      })


def query(query_string):
  # Get the API Key and perform the POST request.
  logging.info("[ Mixer Request ]: \n" + query_string)
  url = get_service_url('/v1/query')
  resp = post(url, {'sparql': query_string})
  return resp['header'], resp.get('rows', [])


def related_place(dcid, variables, ancestor=None, per_capita=False):
  url = get_service_url('/v1/place/related')
  req_json = {'dcid': dcid, 'stat_var_dcids': sorted(variables)}
  if ancestor:
    req_json['within_place'] = ancestor
  if per_capita:
    req_json['is_per_capita'] = per_capita
  return post(url, req_json)


def recognize_places(query):
  url = get_service_url('/v1/recognize/places')
  resp = post(url, {'queries': [query]})
  return resp.get('queryItems', {}).get(query, {}).get('items', [])


def recognize_entities(query):
  url = get_service_url('/v1/recognize/entities')
  resp = post(url, {'queries': [query]})
  return resp.get('queryItems', {}).get(query, {}).get('items', [])


def find_entities(places):
  url = get_service_url('/v1/bulk/find/entities')
  entities = [{'description': p} for p in places]
  resp = post(url, {'entities': entities})
  retval = {p: [] for p in places}
  for ent in resp.get('entities', []):
    if not ent.get('description') or not ent.get('dcids'):
      continue
    retval[ent['description']] = ent['dcids']
  return retval


def search_statvar(query, places, sv_only):
  url = get_service_url('/v1/variable/search')
  return post(url, {
      'query': query,
      'places': places,
      "sv_only": sv_only,
  })


def get_landing_page_data(dcid, category: str, new_stat_vars: List, seed=0):
  req = {'node': dcid, 'category': category, 'seed': seed}
  if new_stat_vars:
    req['newStatVars'] = new_stat_vars
  url = get_service_url('/v1/internal/page/place')
  return post(url, req)
