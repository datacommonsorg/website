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

from services.datacommons import fetch_data
from cache import cache
"""Common library for functions used by multiple tools"""


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def cached_name(dcids):
    """Returns display names for set of dcids.

    Args:
        dcids: ^ separated string of dcids. It must be a single string for the cache.

    Returns:
        A dictionary of display place names, keyed by dcid.
    """
    dcids = dcids.split('^')
    response = fetch_data('/node/property-values', {
        'dcids': dcids,
        'property': 'name',
        'direction': 'out'
    },
                          compress=False,
                          post=True)
    result = {}
    for dcid in dcids:
        if not dcid:
            continue
        values = response[dcid].get('out')
        result[dcid] = values[0]['value'] if values else ''
    return result


def is_float(query_string):
    """Checks if a string can be converted to a float"""
    try:
        float(query_string)
        return True
    except ValueError:
        return False
