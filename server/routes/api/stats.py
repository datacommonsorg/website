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

from flask import Blueprint, request
from cache import cache
import services.datacommons as dc

# Define blueprint
bp = Blueprint(
  "stats",
  __name__,
)

# TODO(shifucun): add unittest for this module


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_stats_wrapper(dcid_str, stats_var):
    """Wrapper function to get stats for multiple places and give statsvar.

    This wrapper takes concatenated place dcids as a string argument so the
    flask cache can work.

    Args:
        dcid_str: place dcids concatenated by "^".
        stats_var: the dcid of the statistical variable.
    Returns:
        An serialized json str. The json is an object keyed by the place dcid
        with value to be the observation time series.
    """
    dcids = dcid_str.split('^')
    return json.dumps(dc.get_stats(dcids, stats_var))


@bp.route('/api/stats/<path:stats_var>')
def stats(stats_var):
    """Handler to get the observation given stats var for multiple places.

    This uses the get_stats_wrapper function so the result can be cached.

    Args:
        stats_var: the dcid of the statistical variable.
    Returns:
        An serialized json str. The json is an object keyed by the place dcid
        with value to be the observation time series.
    """
    place_dcids = request.args.getlist('dcid')
    return get_stats_wrapper('^'.join(place_dcids), stats_var)


@bp.route('/api/stats/stats-var-property')
def stats_var_property():
    """Handler to get the properties of give statistical variables.

    Returns:
        A dictionary keyed by stats var dcid with value being a dictionary of
        all the properties of each stats var.
    """
    dcids = request.args.getlist('dcid')
    return stats_var_property_wrapper(dcids)


def get_stats_url_fragment(dcids):
    """Get stats information give multiple stats var dcids.

    The result is used as partial link to GNI.

    Args:
        dcids: A list of stats var dcids.
    Returns:
        An object keyed by stats dcid, with value being partial url that can
        be used by the /tools/timeline endpoint.
        {
            "Count_Person": "Person,count,gender,Female"
        }
    """
    stats_var_info = stats_var_property_wrapper(dcids)
    result = {}
    for dcid, data in stats_var_info.items():
        tokens = [data['pt'], data['mprop']]
        for p, v in data['pvs'].items():
            tokens.extend([p, v])
        result[dcid] = ','.join(tokens)
    return result


def stats_var_property_wrapper(dcids):
    """Function to get properties for give statistical variables."""
    data = dc.fetch_data(
      '/node/triples',
      {
        'dcids': dcids,
      },
      compress=False,
      post=True
    )
    result = {}
    # Get all the constraint properties
    for dcid, triples in data.items():
        pvs = {}
        for triple in triples:
            if triple['predicate'] == 'constraintProperties':
                pvs[triple["objectId"]] = ''
        pt = ''
        md = ''
        mprop = ''
        for triple in triples:
            if triple['predicate'] == 'measuredProperty':
                mprop = triple['objectId']
            if triple['predicate'] == 'populationType':
                pt = triple['objectId']
            if triple['predicate'] == 'measurementDenominator':
                md = triple['objectId']
            if triple['predicate'] in pvs:
                pvs[triple['predicate']] = triple['objectId']
        result[dcid] = {
            'mprop': mprop,
            'pt': pt,
            'md': md,
            'pvs': pvs,
        }
    return result
