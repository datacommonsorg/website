# Copyright 2023 Google LLC
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

import base64
import collections
import json
import logging
from typing import Dict, List
import urllib.parse
import zlib

from flask import current_app
import requests

from server.cache import cache
import server.lib.config as libconfig
from server.services.discovery import get_health_check_urls
from server.services.discovery import get_service_url

cfg = libconfig.get_config()


# Cache for one day.
@cache.memoize(timeout=3600 * 24)
def get(url: str):
  headers = {'Content-Type': 'application/json'}
  mixer_api_key = current_app.config.get('MIXER_API_KEY', '')
  if mixer_api_key:
    headers['x-api-key'] = mixer_api_key
  # Send the request and verify the request succeeded
  response = requests.get(url, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'Response error: An HTTP {} code ({}) was returned by the mixer.'
        'Printing response:\n{}'.format(response.status_code, response.reason,
                                        response.json()['message']))
  return response.json()


def post(url: str, req: Dict):
  # Get json string so the request can be flask cached.
  # Also to have deterministic req string, the repeated fields in request
  # are sorted.
  req_str = json.dumps(req, sort_keys=True)
  return post_wrapper(url, req_str)


# Cache for one day.
@cache.memoize(timeout=3600 * 24)
def post_wrapper(url, req_str: str):
  req = json.loads(req_str)
  headers = {'Content-Type': 'application/json'}
  mixer_api_key = current_app.config.get('MIXER_API_KEY', '')
  if mixer_api_key:
    headers['x-api-key'] = mixer_api_key
  # Send the request and verify the request succeeded
  response = requests.post(url, json=req, headers=headers)
  if response.status_code != 200:
    raise ValueError(
        'An HTTP {} code ({}) was returned by the mixer: "{}"'.format(
            response.status_code, response.reason, response.content))
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


def obs_point_within(parent_entity, child_type, variables, date='LATEST'):
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
  return post(
      url, {
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
      })


def obs_series(entities, variables):
  """Gets the observation time series for the given entities of the given
  variable.

  Args:
      entities: A list of entities DCIDs.
      variables: A list of statistical variables.
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
      })


def obs_series_within(parent_entity, child_type, variables):
  """Gets the statistical variable series for child places of a certain place
    type contained in a parent place.

  Args:
      parent_entity: Parent entity DCID as a string.
      child_type: Type of child places as a string.
      variables: List of statistical variable DCIDs each as a string.
  """
  url = get_service_url('/v2/observation')
  return post(
      url, {
          'select': ['date', 'value', 'variable', 'entity'],
          'entity': {
              'expression':
                  '{0}<-containedInPlace+{{typeOf:{1}}}'.format(
                      parent_entity, child_type)
          },
          'variable': {
              'dcids': sorted(variables)
          },
      })


def entity_variables(entities):
  """Gets the statistical variables that have obserations for given entities.

  Args:
      entities: List of entity dcids.
  """
  url = get_service_url('/v2/observation')
  return post(url, {
      'select': ['variable', 'entity'],
      'entity': {
          'dcids': entities,
      },
  })


def entity_variables_existence(variables, entities):
  """Check if statistical variables have observations for given entities.

  Args:
      variables: List of variable dcids.
      entities: List of entity dcids.
  """
  url = get_service_url('/v2/observation')
  return post(
      url, {
          'select': ['variable', 'entity'],
          'entity': {
              'dcids': entities,
          },
          'variable': {
              'dcids': variables,
          },
      })


def triples(nodes, direction):
  """Retrieves the triples for a node.

  Args:
      node: Node DCID.
      direction: Predicate direction, either be 'in' or 'out'.
  """
  url = get_service_url('/v2/node')
  return post(url, {
      'nodes': nodes,
      'property': '->*' if direction == 'out' else '<-*'
  })


def properties(nodes, direction):
  """Retrieves the properties for a list of nodes.

  Args:
      nodes: List of node DCIDs.
      direction: Predicate direction, either be 'in' or 'out'.
  """
  url = get_service_url('/v2/node')
  return post(url, {
      'nodes': nodes,
      'property': '->' if direction == 'out' else '<-'
  }).get('data', {})


def property_values(nodes, prop, out=True):
  """Retrieves the property values for a list of nodes.

  Args:
      nodes: A list of node DCIDs.
      prop: The property label to query for.
      out: Whether the property direction is 'out'.
  """
  direction = '->' if out else '<-'
  url = get_service_url('/v2/node')
  return post(url, {
      'nodes': sorted(set(nodes)),
      'property': direction + prop,
  })


def get_place_info(dcids: List[str]) -> Dict:
  """Retrieves Place Info given a list of DCIDs."""
  url = get_service_url('/v1/bulk/info/place')
  return post(f'{url}', {
      'nodes': sorted(set(dcids)),
  })


def get_variable_group_info(nodes: List[str],
                            entities: List[str],
                            numEntitiesExistence=1) -> Dict:
  """Gets the stat var group node information."""
  url = get_service_url('/v1/bulk/info/variable-group')
  req_dict = {
      "constrained_entities": entities,
      "nodes": nodes,
      "num_entities_existence": numEntitiesExistence
  }
  return post(url, req_dict)


def variable_info(nodes: List[str]) -> Dict:
  """Gets the stat var node information."""
  url = get_service_url('/v1/bulk/info/variable')
  req_dict = {"nodes": nodes}
  return post(url, req_dict)


def get_variables(dcid: str):
  """Get all the statistical variable dcids for a place."""
  url = get_service_url('/v1/variables')
  url = f'{url}/{dcid}'
  return get(url).get('variables', [])


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


def observation_existence(variables, entities):
  """Check if observation exist for <entity, variable> pairs"""
  url = get_service_url('/v1/bulk/observation-existence')
  return post(url, {
      'entities': entities,
      'variables': variables,
  })


def bio(entity):
  """Fetch biology subgraph linking to the given entity"""
  url = get_service_url('/v1/internal/page/bio')
  return get(url + "/" + entity)


def resolve_id(in_ids, in_prop, out_prop):
  """Resolves ids given nodes input and output property.

  Args:
      in_ids: A list of input ids.
      in_prop: The input property.
      out_prop: The output property.
  """
  url = get_service_url('/v1/recon/resolve/id')
  return post(url, {
      'ids': in_ids,
      'in_prop': in_prop,
      'out_prop': out_prop,
  })


def resolve_coordinates(coordinates):
  """Resolves a list of coordinates.

  Args:
      coordinates: a list of { longitude: number, latitude: number }.
  """
  url = get_service_url('/v1/recon/resolve/coordinate')
  return post(url, {
      'coordinates': coordinates,
  })


def get_event_collection(event_type,
                         affected_place,
                         date,
                         filter_prop=None,
                         filter_unit=None,
                         filter_upper_limit=None,
                         filter_lower_limit=None):
  """Gets all the events for a specified event type, affected place, date, and
      filter information (filter prop, unit, lower limit, and upper limit).

  Args:
      event_type: type of events to get
      affected_place: affected place of events to get
      date: date of events to get
  """
  return post(
      get_service_url('/v1/events'), {
          'event_type': event_type,
          'affected_place_dcid': affected_place,
          'date': date,
          'filter_prop': filter_prop,
          'filter_unit': filter_unit,
          'filter_upper_limit': filter_upper_limit,
          'filter_lower_limit': filter_lower_limit
      })


def get_event_collection_date(event_type, affected_place):
  """Gets all the dates of events for a specified event type and affected place

  Args:
      event_type: type of event to get the dates for
      affected_place: affected place of events to include dates of
  """
  return post(get_service_url('/v1/events/dates'), {
      'event_type': event_type,
      'affected_place_dcid': affected_place,
  })


def nl_embeddings_vector_at_index(index: int):
  """Embedding vector at index from the NL server."""
  url = f'{cfg.NL_ROOT}/api/embedding?i={index}'
  return get(url).get('embeddings_vector', [])


def nl_embeddings_vector(query):
  """Embedding vector from the NL server."""
  url = f'{cfg.NL_ROOT}/api/embedding?q={query}'
  return get(url).get('embeddings_vector', [])


def nl_search_sv(query):
  """Search sv from NL server."""
  url = f'{cfg.NL_ROOT}/api/search_sv?q={query}'
  return get(url)


def nl_detect_place_ner(query):
  """Detect places from NL server."""
  url = f'{cfg.NL_ROOT}/api/search_places?q={query}'
  return get(url).get('places', [])


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
  req_json = {'schema_mapping': mapping, 'sparql': sparql}
  return send_request(url, req_json=req_json, has_payload=False)


def version():
  """Returns the version of mixer.

  Currently all service groups must have the same version.
  """
  url = get_health_check_urls()[0]
  return send_request(url, req_json={}, post=False, has_payload=False)


def get_place_ranking(stat_vars,
                      place_type,
                      within_place=None,
                      is_per_capita=False):
  url = get_service_url('/node/ranking-locations')
  req_json = {
      'stat_var_dcids': stat_vars,
      'place_type': place_type,
      'within_place': within_place,
      'is_per_capita': is_per_capita,
  }
  return send_request(url, req_json=req_json, post=False, has_payload=False)


def get_places_in_v1(dcids, place_type):
  # Convert the dcids field and format the request to GetPlacesIn
  url = get_service_url('/v1/bulk/property/values/in/linked')
  return post(
      url, {
          'nodes': dcids,
          'property': 'containedInPlace',
          'value_node_type': place_type,
      })


def get_places_in(dcids, place_type):
  # Convert the dcids field and format the request to GetPlacesIn
  url = get_service_url('/node/places-in')
  payload = send_request(url,
                         req_json={
                             'dcids': dcids,
                             'place_type': place_type,
                         },
                         post=False)

  # Create the results and format it appropriately
  result = _format_expand_payload(payload, 'place', must_exist=dcids)
  return result


def query(query_string):
  # Get the API Key and perform the POST request.
  logging.info("[ Mixer Request ]: \n" + query_string)
  headers = {'Content-Type': 'application/json'}
  url = get_service_url('/query')
  response = requests.post(url,
                           json={'sparql': query_string},
                           headers=headers,
                           timeout=60)
  if response.status_code != 200:
    raise ValueError(
        'Response error: An HTTP {} code was returned by the mixer. '
        'Printing response\n{}'.format(response.status_code, response.reason))
  res_json = response.json()
  return res_json['header'], res_json.get('rows', [])


def get_related_place(dcid, stat_vars, within_place=None, is_per_capita=None):
  url = get_service_url('/node/related-locations')
  req_json = {'dcid': dcid, 'stat_var_dcids': stat_vars}
  if within_place:
    req_json['within_place'] = within_place
  if is_per_capita:
    req_json['is_per_capita'] = is_per_capita
  return send_request(url, req_json, has_payload=False)


def search_statvar(query, places, sv_only):
  url = get_service_url('/stat-var/search')
  req_json = {
      'query': query,
      'places': places,
      "sv_only": sv_only,
  }
  return send_request(url, req_json, has_payload=False)


def match_statvar(query: str, limit: int, debug: bool):
  url = get_service_url('/stat-var/match')
  req_json = {
      'query': query,
      'limit': limit,
      'debug': debug,
  }
  return send_request(url, req_json, has_payload=False)


def get_landing_page_data(dcid, category: str, new_stat_vars: List):
  req = {'node': dcid, 'category': category}
  if new_stat_vars:
    req['newStatVars'] = new_stat_vars
  url = get_service_url('/v1/internal/page/place')
  return post(url, req)


# ------------------------- INTERNAL HELPER FUNCTIONS -------------------------


def send_request(req_url,
                 req_json={},
                 compress=False,
                 post=True,
                 has_payload=True):
  """ Sends a POST/GET request to req_url with req_json, default to POST.

  Returns:
    The payload returned by sending the POST/GET request formatted as a dict.
  """
  headers = {'Content-Type': 'application/json'}

  # Send the request and verify the request succeeded
  if post:
    response = requests.post(req_url, json=req_json, headers=headers)
  else:
    response = requests.get(req_url, params=req_json, headers=headers)

  if response.status_code != 200:
    raise ValueError(
        'Response error: An HTTP {} code ({}) was returned by the mixer. '
        'Printing response:\n{}'.format(response.status_code, response.reason,
                                        response.json()['message']))
  # Get the JSON
  res_json = response.json()
  # If the payload is compressed, decompress and decode it
  if has_payload:
    res_json = res_json['payload']
    if compress:
      res_json = zlib.decompress(base64.b64decode(res_json),
                                 zlib.MAX_WBITS | 32)
    res_json = json.loads(res_json)
  return res_json


def fetch_data(endpoint_name: str,
               req_json: Dict,
               compress,
               post,
               has_payload=True):
  url = get_service_url(endpoint_name)
  return send_request(url, req_json, compress, post, has_payload)


def _format_expand_payload(payload, new_key, must_exist=[]):
  """ Formats expand payloads into dicts from dcids to lists of values."""
  # Create the results dictionary from payload
  results = collections.defaultdict(set)
  for entry in payload:
    if 'dcid' in entry and new_key in entry:
      dcid = entry['dcid']
      results[dcid].add(entry[new_key])

  # Ensure all dcids in must_exist have some entry in results.
  for dcid in must_exist:
    results[dcid]
  return {k: sorted(list(v)) for k, v in results.items()}
