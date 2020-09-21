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
"""functions for reading data from datacommons"""

import requests
import json
import collections
from google.cloud import secretmanager

API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'


def get_api_key():
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path('datcom-mixer-staging',
                                                    'mixer-api-key', '1')
    secret_response = secret_client.access_secret_version(secret_name)
    DC_API_KEY = secret_response.payload.data.decode('UTF-8')
    return DC_API_KEY


def get_sv_dcids():
    req_url = API_ROOT + "/query"
    query_str = "SELECT ?a WHERE {?a typeOf StatisticalVariable}"
    headers = {'x-api-key': get_api_key(), 'Content-Type': 'application/json'}
    response = requests.post(req_url,
                             json={'sparql': query_str},
                             headers=headers,
                             timeout=60)
    result = response.json()
    sv_dcid = [temp['cells'][0]['value'] for temp in result['rows']]
    return sv_dcid


def get_triples(dcids):
    # Generate the GetTriple query and send the request.
    url = API_ROOT + '/node/triples'
    payload = send_request(url, req_json={'dcids': dcids})
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


def send_request(req_url, req_json={}, compress=False, post=True):
    """ Sends a POST/GET request to req_url with req_json, default to POST.
    Returns:
      The payload returned by sending the POST/GET request formatted as a dict.
    """
    headers = {'x-api-key': get_api_key(), 'Content-Type': 'application/json'}

    # Send the request and verify the request succeeded
    if post:
        response = requests.post(req_url, json=req_json, headers=headers)
    else:
        response = requests.get(req_url, params=req_json, headers=headers)

    if response.status_code != 200:
        raise ValueError(
            'Response error: An HTTP {} code was returned by the mixer. Printing '
            'response\n{}'.format(response.status_code, response.reason))

    # Get the JSON
    res_json = response.json()
    if 'payload' not in res_json:
        raise ValueError(
            'Response error: Payload not found. Printing response\n\n'
            '{}'.format(res_json))

    # If the payload is compressed, decompress and decode it
    payload = res_json['payload']
    if compress:
        payload = zlib.decompress(base64.b64decode(payload),
                                  zlib.MAX_WBITS | 32)
    return json.loads(payload)
