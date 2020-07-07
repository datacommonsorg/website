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
    dcids = dcid_str.split('^')
    return json.dumps(dc.get_stats(dcids, stats_var))


@bp.route('/api/stats/<path:stats_var>')
def stats(stats_var):
    """Handler to get the observation given stats var."""
    place_dcids = request.args.getlist('dcid')
    return get_stats_wrapper('^'.join(place_dcids), stats_var)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_statsinfo_wrapper(statsvars_string):
    dcids = statsvars_string.split('^')
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


@bp.route('/api/statsinfo')
def statsinfo():
    """Handler to get the statsvar information."""
    stats_vars = sorted(request.args.getlist('dcid'))
    return get_statsinfo_wrapper('^'.join(stats_vars))
