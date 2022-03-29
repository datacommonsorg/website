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
from typing import Mapping

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
    'get_property_values': '/node/property-values',
    'get_triples': '/node/triples',
    'get_places_in': '/node/places-in',
    'get_place_obs': '/bulk/place-obs',
    'get_place_ranking': '/node/ranking-locations',
    'get_chart_data': '/node/chart-data',
    'get_stat_set_series': '/v1/stat/set/series',
    'get_stats_all': '/stat/all',
    'get_stats_value': '/stat/value',
    'get_stat_set_within_place': '/stat/set/within-place',
    'get_stat_set_within_place_all': '/stat/set/within-place/all',
    'get_stat_set_series_within_place': '/stat/set/series/within-place',
    'get_stat_set': '/stat/set',
    # TODO(shifucun): switch back to /node/related-places after data switch.
    'get_related_places': '/node/related-locations',
    'get_interesting_places': '/node/interesting-place-aspects',
    'get_statvar_groups': '/stat-var/group/all',
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


def get_stat_set_series(places, stat_vars):
    url = API_ROOT + API_ENDPOINTS['get_stat_set_series']
    req_json = {
        'places': places,
        'stat_vars': stat_vars,
    }
    return send_request(url, req_json=req_json, has_payload=False)


def get_stats_all(place_dcids, stat_vars):
    url = API_ROOT + API_ENDPOINTS['get_stats_all']
    req_json = {
        'places': place_dcids,
        'stat_vars': stat_vars,
    }
    return send_request(url, req_json=req_json, has_payload=False)


def get_stats_value(place, stat_var, date, measurement_method,
                    observation_period, unit, scaling_factor):
    """See https://docs.datacommons.org/api/rest/stat_value.html."""
    url = API_ROOT + API_ENDPOINTS['get_stats_value']
    req_json = {
        'place': place,
        'stat_var': stat_var,
        'date': date,
        'measurement_method': measurement_method,
        'observation_period': observation_period,
        'unit': unit,
        'scaling_factor': scaling_factor
    }
    return send_request(url, req_json=req_json, post=False, has_payload=False)


def get_stat_set_within_place(parent_place, child_type, stat_vars, date):
    """Gets the statistical variable values for child places of a certain place
    type contained in a parent place at a given date.

    Args:
        parent_place: Parent place DCID as a string.
        child_type: Type of child places as a string.
        stat_vars: List of statistical variable DCIDs each as a string.
        date (optional): Date as a string of the form YYYY-MM-DD where MM and DD are optional.

    Returns:
        Dict with a single key "data". The value is a dict keyed by statvar DCIDs,
        with dicts as values. See `SourceSeries` in
        https://github.com/datacommonsorg/mixer/blob/master/proto/mixer.proto
        for the definition of the inner dicts. In particular, the values for "val"
        are dicts keyed by child place DCIDs with the statvar values as values.
    """
    url = API_ROOT + API_ENDPOINTS['get_stat_set_within_place']
    req_json = {
        'parent_place': parent_place,
        'child_type': child_type,
        'date': date,
        'stat_vars': stat_vars
    }
    return send_request(url, req_json=req_json, has_payload=False)


def get_stat_set_within_place_all(parent_place, child_type, stat_vars, date):
    """Gets the statistical variable values for child places of a certain place
    type contained in a parent place at a given date. This returns the stat for
    all the sources.

    Args:
        parent_place: Parent place DCID as a string.
        child_type: Type of child places as a string.
        stat_vars: List of statistical variable DCIDs each as a string.
        date (optional): Date as a string of the form YYYY-MM-DD where MM and DD are optional.
    """
    url = API_ROOT + API_ENDPOINTS['get_stat_set_within_place_all']
    req_json = {
        'parent_place': parent_place,
        'child_type': child_type,
        'date': date,
        'stat_vars': stat_vars
    }
    return send_request(url, req_json=req_json, has_payload=False)


def get_stat_set_series_within_place(parent_place, child_type, stat_vars):
    """Gets the statistical variable series for child places of a certain place
    type contained in a parent place.

    Args:
        parent_place: Parent place DCID as a string.
        child_type: Type of child places as a string.
        stat_vars: List of statistical variable DCIDs each as a string.
    """
    url = API_ROOT + API_ENDPOINTS['get_stat_set_series_within_place']
    req_json = {
        'parent_place': parent_place,
        'child_type': child_type,
        'stat_vars': stat_vars
    }
    return send_request(url, req_json=req_json, has_payload=False, post=False)


def get_stat_set(places, stat_vars, date=None):
    url = API_ROOT + API_ENDPOINTS['get_stat_set']
    req_json = {
        'places': places,
        'stat_vars': stat_vars,
        'date': date,
    }
    return send_request(url, req_json=req_json, post=True, has_payload=False)


def get_chart_data(keys):
    # Generate the GetProperty query and send the request
    url = API_ROOT + API_ENDPOINTS['get_chart_data']
    req_json = {
        'keys': keys,
    }
    return send_request(url, req_json=req_json)


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


def get_property_values(dcids,
                        prop,
                        out=True,
                        value_type=None,
                        limit=_MAX_LIMIT):
    # Convert the dcids field and format the request to GetPropertyValue
    req_json = {'dcids': dcids, 'property': prop, 'limit': limit}
    if value_type:
        req_json['value_type'] = value_type

    # Send the request
    url = API_ROOT + API_ENDPOINTS['get_property_values']
    payload = send_request(url, req_json=req_json)

    # Create the result format for when dcids is provided as a list.
    unique_results = collections.defaultdict(set)
    for dcid in dcids:
        # Get the list of nodes based on the direction given.
        nodes = []
        if dcid in payload and out:
            nodes = payload[dcid].get('out', [])
        elif dcid in payload and not out:
            nodes = payload[dcid].get('in', [])

        # Add nodes to unique_results if it is not empty
        for node in nodes:
            if 'dcid' in node:
                unique_results[dcid].add(node['dcid'])
            elif 'value' in node:
                unique_results[dcid].add(node['value'])

    # Make sure each dcid is in the results dict, and convert sets to lists.
    results = {dcid: sorted(list(unique_results[dcid])) for dcid in dcids}
    return results


def get_triples_processed(dcids, limit=_MAX_LIMIT):
    """
    Generate the GetTriple query and send the request.

    The response is processed into as triples strings. This API is used by the
    pv tree tool.
    """
    url = API_ROOT + API_ENDPOINTS['get_triples']
    payload = send_request(url, req_json={'dcids': dcids, 'limit': limit})

    # Create a map from dcid to list of triples.
    results = collections.defaultdict(list)
    for dcid in dcids:
        # Make sure each dcid is mapped to an empty list.
        results[dcid]

        # Add triples as appropriate
        for t in payload[dcid]:
            if 'objectId' in t:
                results[dcid].append(
                    (t['subjectId'], t['predicate'], t['objectId']))
            elif 'objectValue' in t:
                results[dcid].append(
                    (t['subjectId'], t['predicate'], t['objectValue']))
    return dict(results)


def get_triples(dcids, limit=0):
    """
    Get the triples in the raw format as the REST response.

    This is used by the flask server to retrieve node triples.
    Limit of 0 does not apply a limit and use all available triples from cache.
    """
    url = API_ROOT + API_ENDPOINTS['get_triples']
    return send_request(url, req_json={'dcids': dcids, 'limit': limit})


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


def get_place_obs(place_type,
                  observation_date,
                  population_type,
                  constraining_properties={}):
    # Create the json payload and send it to the REST API.
    pv = [{
        'property': k,
        'value': v
    } for k, v in constraining_properties.items()]
    url = API_ROOT + API_ENDPOINTS['get_place_obs']
    payload = send_request(url,
                           req_json={
                               'place_type': place_type,
                               'observation_date': observation_date,
                               'population_type': population_type,
                               'pvs': pv,
                           },
                           compress=True)
    return payload['places']


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


def get_interesting_places(dcids):
    url = API_ROOT + API_ENDPOINTS['get_interesting_places']
    req_json = {'dcids': dcids}
    payload = send_request(url, req_json, post=False)
    return payload


def get_statvar_groups(dcids):
    url = API_ROOT + API_ENDPOINTS['get_statvar_groups']
    req_json = {
        'places': dcids,
    }
    response = send_request(url, req_json, has_payload=False)
    return response.get('statVarGroups', {})


def search_statvar(query, places, enable_blocklist):
    url = API_ROOT + API_ENDPOINTS['search_statvar']
    req_json = {
        'query': query,
        'places': places,
        'enable_blocklist': enable_blocklist,
    }
    return send_request(url, req_json, has_payload=False)


def match_statvar(property_value: Mapping[str, str], limit: int):
    url = API_ROOT + API_ENDPOINTS['match_statvar']
    req_json = {
        'property_value': property_value,
        'limit': limit,
    }
    return send_request(url, req_json, has_payload=False)


def get_statvar_group(stat_var_group, places):
    url = API_ROOT + API_ENDPOINTS['get_statvar_group']
    req_json = {
        'stat_var_group': stat_var_group,
        'places': places,
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


def fetch_data(path, req_json, compress, post, has_payload=True):
    req_url = API_ROOT + path
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
