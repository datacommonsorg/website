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
import logging

# Define blueprint
bp = Blueprint(
  "stats",
  __name__,
)


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
    logging.info("%s, %s", dcids, stats_var)
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


def get_stats_info(dcids):
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
        pop_type = ''
        mprop = ''
        for triple in triples:
            if triple['predicate'] == 'measuredProperty':
                mprop = triple['objectId']
            if triple['predicate'] == 'populationType':
                pop_type = triple['objectId']
            if triple['predicate'] in pvs:
                pvs[triple['predicate']] = triple['objectId']
        tokens = [pop_type, mprop]
        for p, v in pvs.items():
            tokens.extend([p, v])
        result[dcid] = ','.join(tokens)
    return result
