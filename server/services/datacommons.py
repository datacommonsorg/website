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
"""Copy of Data Commons Python Client API Core without pandas dependency."""

import base64
import collections
import json
import logging
import urllib.parse
import zlib
from cache import cache
from flask import current_app
from typing import List

import lib.config as libconfig
import requests

cfg = libconfig.get_config()

API_ROOT = cfg.API_ROOT

# --------------------------------- CONSTANTS ---------------------------------

# REST API endpoint paths
API_ENDPOINTS = {
    'query': '/query',
    'translate': '/translate',
    'search': '/search',
    'get_property_labels': '/node/property-labels',
    'get_places_in': '/node/places-in',
    'get_place_ranking': '/node/ranking-locations',
    # TODO(shifucun): switch back to /node/related-places after data switch.
    'get_related_places': '/node/related-locations',
    'get_statvar_group': '/stat-var/group',
    'get_statvar_path': '/stat-var/path',
    'search_statvar': '/stat-var/search',
    'match_statvar': '/stat-var/match',
    'get_statvar_summary': '/stat-var/summary',
    'version': '/version',
}

# The default value to limit to
_MAX_LIMIT = 100

# ----------------------------- WRAPPER FUNCTIONS -----------------------------


# Cache for one day.
@cache.memoize(timeout=3600 * 24)
def get(path):
    url = API_ROOT + path
    headers = {'Content-Type': 'application/json'}
    dc_api_key = current_app.config.get('DC_API_KEY', '')
    if dc_api_key:
        headers['x-api-key'] = dc_api_key
    # Send the request and verify the request succeeded
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code ({}) was returned by the mixer.'
            'Printing response:\n{}'.format(response.status_code,
                                            response.reason,
                                            response.json()['message']))
    return response.json()


def post(path, req):
    # Get json string so the request can be flask cached.
    # Also to have deterministic req string, the repeated fields in request
    # are sorted.
    req_str = json.dumps(req, sort_keys=True)
    return post_wrapper(path, req_str)


# Cache for one day.
@cache.memoize(timeout=3600 * 24)
def post_wrapper(path, req_str):
    req = json.loads(req_str)
    url = API_ROOT + path
    headers = {'Content-Type': 'application/json'}
    dc_api_key = current_app.config.get('DC_API_KEY', '')
    if dc_api_key:
        headers['x-api-key'] = dc_api_key
    # Send the request and verify the request succeeded
    response = requests.post(url, json=req, headers=headers)
    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code ({}) was returned by the mixer.'
            'Printing response:\n{}'.format(response.status_code,
                                            response.reason,
                                            response.json()['message']))
    return response.json()


def point(entities, variables, date='', all_facets=False):
    """Gets the observation point for the given entities of the given
    variable.

    Args:
        entities: A list of entities DCIDs.
        variables: A list of statistical variables.
        date (optional): The date of the observation. If not set, the latest
            observation is returned.
        all_facets (optional): Whether or not to get data for all facets.
    """
    return post(
        '/v1/bulk/observations/point', {
            'entities': sorted(entities),
            'variables': sorted(variables),
            'date': date,
            'all_facets': all_facets,
        })


def point_within(parent_entity,
                 child_type,
                 variables,
                 date='',
                 all_facets=False):
    """Gets the statistical variable values for child places of a certain place
    type contained in a parent place at a given date.

    Args:
        parent_entity: Parent place DCID as a string.
        child_type: Type of child places as a string.
        variables: List of statistical variable DCIDs each as a string.
        date (optional): Date as a string of the form YYYY-MM-DD where MM and DD are optional.
        all_facets (optional): Whether or not to get data for all facets

    Returns:
        Dict with a key "facets" and a key "observationsByVariable".
        The value for "facets" is a dict keyed by facet ids, with dicts as values
        (See "StatMetadata" in https://github.com/datacommonsorg/mixer/blob/master/proto/stat.proto for the definition of the inner dicts)
        The value for "observationsByVariable" is a list of dicts (See "VariableObservations"
        in https://github.com/datacommonsorg/mixer/blob/master/proto/v1/observations.proto for the definition of these dicts)

    """
    return post(
        '/v1/bulk/observations/point/linked', {
            'linked_entity': parent_entity,
            'linked_property': 'containedInPlace',
            'entity_type': child_type,
            'variables': sorted(variables),
            'date': date,
            'all_facets': all_facets,
        })


def series(entities, variables, all_facets=False):
    """Gets the observation time series for the given entities of the given
    variable.

    Args:
        entities: A list of entities DCIDs.
        variables: A list of statistical variables.
        all_facets (optional): Whether or not to get data for all facets.
    """
    return post(
        '/v1/bulk/observations/series', {
            'entities': sorted(entities),
            'variables': sorted(variables),
            'all_facets': all_facets,
        })


def series_within(parent_entity, child_type, variables, all_facets=False):
    """Gets the statistical variable series for child places of a certain place
    type contained in a parent place.

    Args:
        parent_entity: Parent entity DCID as a string.
        child_type: Type of child places as a string.
        variables: List of statistical variable DCIDs each as a string.
        all_facets (optional): Whether or not to get data for all facets
    """
    return post(
        '/v1/bulk/observations/series/linked', {
            'linked_entity': parent_entity,
            'linked_property': "containedInPlace",
            'entity_type': child_type,
            'variables': sorted(variables),
            'all_facets': all_facets,
        })


def triples(node, direction):
    """Retrieves the triples for a node.
    Args:
        node: Node DCID.
        direction: Predicate direction, either be 'in' or 'out'.
    """
    return get(f'/v1/triples/{direction}/{node}')


def property_values(nodes, prop, out=True):
    """Retrieves the property values for a list of nodes.
    Args:
        nodes: A list of node DCIDs.
        prop: The property label to query for.
        out: Whether the property direction is 'out'.
    """
    direction = 'out' if out else 'in'
    resp = post(f'/v1/bulk/property/values/{direction}', {
        'nodes': sorted(nodes),
        'property': prop,
    })
    result = {}
    for item in resp.get('data', []):
        node, values = item['node'], item.get('values', [])
        result[node] = []
        for v in values:
            if 'dcid' in v:
                result[node].append(v['dcid'])
            else:
                result[node].append(v['value'])
    return result


def resolve_id(in_ids, in_prop, out_prop):
    """Resolves ids given nodes input and output property.
    Args:
        in_ids: A list of input ids.
        in_prop: The input property.
        out_prop: The output property.
    """
    return post('/v1/recon/resolve/id', {
        "ids": in_ids,
        'in_prop': in_prop,
        'out_prop': out_prop,
    })


# =======================   V0 V0 V0 ================================
def search(query_text, max_results):
    req_url = API_ROOT + API_ENDPOINTS['search']
    req_url += '?query={}&max_results={}'.format(
        urllib.parse.quote(query_text.replace(',', ' ')), max_results)
    response = requests.get(req_url)
    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code was returned by the mixer. '
            'Printing response\n{}'.format(response.status_code,
                                           response.reason))
    return response.json()


def translate(sparql, mapping):
    url = API_ROOT + API_ENDPOINTS['translate']
    req_json = {'schema_mapping': mapping, 'sparql': sparql}
    return send_request(url, req_json=req_json, has_payload=False)


def version():
    url = API_ROOT + API_ENDPOINTS['version']
    return send_request(url, req_json={}, post=False, has_payload=False)


def get_place_ranking(stat_vars,
                      place_type,
                      within_place=None,
                      is_per_capita=False):
    url = API_ROOT + API_ENDPOINTS['get_place_ranking']
    req_json = {
        'stat_var_dcids': stat_vars,
        'place_type': place_type,
        'within_place': within_place,
        'is_per_capita': is_per_capita,
    }
    return send_request(url, req_json=req_json, post=False, has_payload=False)


def get_property_labels(dcids):
    # Generate the GetProperty query and send the request
    url = API_ROOT + API_ENDPOINTS['get_property_labels']
    payload = send_request(url, req_json={'dcids': dcids})

    # Return the results based on the orientation
    results = {}
    for dcid in dcids:
        results[dcid] = payload[dcid]
    return results


def get_places_in(dcids, place_type):
    # Convert the dcids field and format the request to GetPlacesIn
    url = API_ROOT + API_ENDPOINTS['get_places_in']
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
    req_url = API_ROOT + API_ENDPOINTS['query']
    response = requests.post(req_url,
                             json={'sparql': query_string},
                             headers=headers,
                             timeout=60)
    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code was returned by the mixer. '
            'Printing response\n{}'.format(response.status_code,
                                           response.reason))
    res_json = response.json()
    return res_json['header'], res_json.get('rows', [])


def get_related_place(dcid, stat_vars, within_place=None, is_per_capita=None):
    url = API_ROOT + API_ENDPOINTS['get_related_places']
    req_json = {'dcid': dcid, 'stat_var_dcids': stat_vars}
    if within_place:
        req_json['within_place'] = within_place
    if is_per_capita:
        req_json['is_per_capita'] = is_per_capita
    return send_request(url, req_json, has_payload=False)


def search_statvar(query, places, sv_only):
    url = API_ROOT + API_ENDPOINTS['search_statvar']
    req_json = {
        'query': query,
        'places': places,
        "sv_only": sv_only,
    }
    return send_request(url, req_json, has_payload=False)


def match_statvar(query: str, limit: int, debug: bool):
    url = API_ROOT + API_ENDPOINTS['match_statvar']
    req_json = {
        'query': query,
        'limit': limit,
        'debug': debug,
    }
    return send_request(url, req_json, has_payload=False)


def get_statvar_group(stat_var_group, entities):
    url = API_ROOT + API_ENDPOINTS['get_statvar_group']
    req_json = {
        'stat_var_group': stat_var_group,
        'entities': entities,
    }
    return send_request(url, req_json, has_payload=False)


def get_statvar_path(id):
    url = API_ROOT + API_ENDPOINTS['get_statvar_path']
    req_json = {
        'id': id,
    }
    return send_request(url, req_json, has_payload=False)


def get_statvar_summary(dcids):
    url = API_ROOT + API_ENDPOINTS['get_statvar_summary']
    req_json = {
        'stat_vars': dcids,
    }
    return send_request(url, req_json, has_payload=False)


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

    logging.info("Requesting data: %s", req_url)

    # Send the request and verify the request succeeded
    if post:
        response = requests.post(req_url, json=req_json, headers=headers)
    else:
        response = requests.get(req_url, params=req_json, headers=headers)

    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code ({}) was returned by the mixer. '
            'Printing response:\n{}'.format(response.status_code,
                                            response.reason,
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


def fetch_data(path, req_json, compress, post, has_payload=True, encode=False):
    req_url = API_ROOT + path
    # logging.info("Requesting data: %s", req_url)
    # logging.info(req_json)
    if encode:
        req_url = req_url + urllib.parse.urlencode(req_json)
    return send_request(req_url, req_json, compress, post, has_payload)


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
