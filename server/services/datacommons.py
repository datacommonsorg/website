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
import os
import zlib
import urllib

import requests
from werkzeug.utils import import_string
from google.cloud import secretmanager

if os.environ.get('FLASK_ENV') == 'test':
    cfg = import_string('configmodule.TestConfig')()
elif os.environ.get('FLASK_ENV') == 'production':
    cfg = import_string('configmodule.ProductionConfig')()
else:
    cfg = import_string('configmodule.DevelopmentConfig')()

API_ROOT = cfg.API_ROOT
API_PROJECT = cfg.API_PROJECT

if os.environ.get('FLASK_ENV') == 'test':
    DC_API_KEY = 'api-key'
else:
    # Read the api key from Google Cloud Secret Manager
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path(
        API_PROJECT, 'mixer-api-key', '1')
    secret_response = secret_client.access_secret_version(secret_name)
    DC_API_KEY = secret_response.payload.data.decode('UTF-8')

# --------------------------------- CONSTANTS ---------------------------------

# REST API endpoint paths
API_ENDPOINTS = {
    'query': '/query',
    'search': '/search',
    'get_property_labels': '/node/property-labels',
    'get_property_values': '/node/property-values',
    'get_triples': '/node/triples',
    'get_places_in': '/node/places-in',
    'get_populations': '/node/populations',
    'get_observations': '/node/observations',
    'get_pop_obs': '/bulk/pop-obs',
    'get_place_obs': '/bulk/place-obs',
    'get_chart_data': '/node/chart-data',
    'get_stats': '/bulk/stats',
    # TODO(shifucun): switch back to /node/related-places after data switch.
    'get_related_places': '/node/related-locations',
    'get_interesting_places': '/node/interesting-place-aspects',
}

# The default value to limit to
_MAX_LIMIT = 100


# ----------------------------- WRAPPER FUNCTIONS -----------------------------

def search(query_text, max_results):
    req_url = API_ROOT + API_ENDPOINTS['search']
    req_url += '?key={}&query={}&max_results={}'.format(
        DC_API_KEY,
        urllib.parse.quote(query_text.replace(',', ' ')),
        max_results)
    response = requests.get(req_url)
    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code was returned by the mixer. '
            'Printing response\n{}'.format(
                response.status_code, response.reason))
    return response.json()


def get_stats(place_dcids, stats_var):
    url = API_ROOT + API_ENDPOINTS['get_stats']
    req_json = {
        'place': place_dcids,
        'stats_var': stats_var,
    }
    return send_request(url, req_json=req_json)


def get_chart_data(keys):
    # Generate the GetProperty query and send the request
    url = API_ROOT + API_ENDPOINTS['get_chart_data']
    req_json = {
        'keys': keys,
    }
    return send_request(url, req_json=req_json)


def get_property_labels(dcids, out=True):
    # Generate the GetProperty query and send the request
    url = API_ROOT + API_ENDPOINTS['get_property_labels']
    payload = send_request(url, req_json={'dcids': dcids})

    # Return the results based on the orientation
    results = {}
    for dcid in dcids:
        if out:
            results[dcid] = payload[dcid]['outLabels']
        else:
            results[dcid] = payload[dcid]['inLabels']
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


def get_triples(dcids, limit=_MAX_LIMIT):
    # Generate the GetTriple query and send the request.
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


def get_places_in(dcids, place_type):
    # Convert the dcids field and format the request to GetPlacesIn
    url = API_ROOT + API_ENDPOINTS['get_places_in']
    payload = send_request(
        url, req_json={
            'dcids': dcids,
            'place_type': place_type,
        }, post=False)

    # Create the results and format it appropriately
    result = _format_expand_payload(payload, 'place', must_exist=dcids)
    return result


def get_populations(dcids, population_type, constraining_properties={}):
    # Convert the dcids field and format the request to GetPopulations
    pv = [{'property': k, 'value': v}
          for k, v in constraining_properties.items()]
    url = API_ROOT + API_ENDPOINTS['get_populations']
    payload = send_request(
        url,
        req_json={
            'dcids': dcids,
            'population_type': population_type,
            'pvs': pv,
        })

    # Create the results and format it appropriately
    result = _format_expand_payload(payload, 'population', must_exist=dcids)

    # Drop empty results while flattening
    return _flatten_results(result)


def get_observations(dcids,
                     measured_property,
                     stats_type,
                     observation_date,
                     observation_period=None,
                     measurement_method=None):
    # Convert the dcids field and format the request to GetObservation
    req_json = {
        'dcids': dcids,
        'measured_property': measured_property,
        'stats_type': stats_type,
        'observation_date': observation_date,
    }
    if observation_period:
        req_json['observation_period'] = observation_period
    if measurement_method:
        req_json['measurement_method'] = measurement_method

    # Issue the request to GetObservation
    url = API_ROOT + API_ENDPOINTS['get_observations']
    payload = send_request(url, req_json=req_json)

    # Create the results and format it appropriately
    result = _format_expand_payload(payload, 'observation', must_exist=dcids)

    # Drop empty results by calling _flatten_results without default_value,
    # then coerce the type to float if possible.
    typed_results = {}
    for k, v in _flatten_results(result).items():
        try:
            typed_results[k] = float(v)
        except ValueError:
            typed_results[k] = v
    return typed_results


def get_pop_obs(dcid):
    url = API_ROOT + API_ENDPOINTS['get_pop_obs'] + '?dcid={}'.format(dcid)
    params = {'dcid': dcid}
    return send_request(url, req_json=params, compress=True, post=False)


def get_place_obs(place_type,
                  observation_date,
                  population_type,
                  constraining_properties={}):
    # Create the json payload and send it to the REST API.
    pv = [{'property': k, 'value': v}
          for k, v in constraining_properties.items()]
    url = API_ROOT + API_ENDPOINTS['get_place_obs']
    payload = send_request(
        url,
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
    logging.info("[ Mixer Request ]: query")
    headers = {
        'x-api-key': DC_API_KEY,
        'Content-Type': 'application/json'
    }
    req_url = API_ROOT + API_ENDPOINTS['query']
    response = requests.post(
        req_url,
        json={'sparql': query_string},
        headers=headers,
        timeout=60)
    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code was returned by the mixer. '
            'Printing response\n{}'.format(
                response.status_code, response.reason))
    res_json = response.json()
    return res_json['header'], res_json['rows']


def get_related_place(
        dcid, stats_vars, same_place_type=None, within_place=None,
        is_per_capita=None):
    url = API_ROOT + API_ENDPOINTS['get_related_places']
    req_json = {
        'dcid': dcid,
        'stat_var_dcids': stats_vars
    }
    if same_place_type:
        req_json['same_place_type'] = same_place_type
    if within_place:
        req_json['within_place'] = within_place
    if is_per_capita:
        req_json['is_per_capita'] = is_per_capita
    return send_request(url, req_json)


def get_interesting_places(dcids):
    url = API_ROOT + API_ENDPOINTS['get_interesting_places']
    req_json = {'dcids': dcids}
    payload = send_request(url, req_json, post=False)
    return payload

# ------------------------- INTERNAL HELPER FUNCTIONS -------------------------


def send_request(
        req_url, req_json={}, compress=False, post=True, has_payload=True):
    """ Sends a POST/GET request to req_url with req_json, default to POST.
    Returns:
      The payload returned by sending the POST/GET request formatted as a dict.
    """
    headers = {
        'x-api-key': DC_API_KEY,
        'Content-Type': 'application/json'
    }
    logging.info("Send request to %s", req_url)

    # Send the request and verify the request succeeded
    if post:
        response = requests.post(req_url, json=req_json, headers=headers)
    else:
        response = requests.get(req_url, params=req_json, headers=headers)

    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code was returned by the mixer. '
            'Printing response\n{}'.format(
                response.status_code, response.reason))

    # Get the JSON
    res_json = response.json()

    # If the payload is compressed, decompress and decode it
    if has_payload:
        res_json = res_json['payload']
        if compress:
            res_json = zlib.decompress(
                base64.b64decode(res_json), zlib.MAX_WBITS | 32)
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


def _flatten_results(result, default_value=None):
    """ Formats results to map to a single value or default value if empty. """
    flattened = {}
    for k, v in result.items():
        if len(v) > 1:
            raise ValueError(
                'Expected one, but more returned for "{}": {}'.format(k, v))
        if len(v) == 1:
            flattened[k] = v[0]
        elif default_value is not None:
            flattened[k] = default_value
    return flattened
