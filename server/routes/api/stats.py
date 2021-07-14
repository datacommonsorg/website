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

from flask import Blueprint, request, Response
from cache import cache
import services.datacommons as dc

# Define blueprint
bp = Blueprint("stats", __name__)

# TODO(shifucun): add unittest for this module


def get_stats_latest(dcid_str, stats_var):
    """ Returns the most recent data as from a DataCommons API payload.
    Args:
        dcid_str: place dcids concatenated by "^".
        stats_var: the dcid of the statistical variable.
    Returns:
        An object keyed by dcid, with the most recent value available for
        that dcid.
    """
    response = json.loads(get_stats_wrapper(dcid_str, stats_var))
    result = {}
    for dcid, stats in response.items():
        if not stats or not 'data' in stats:
            result[dcid] = 0
        else:
            data = stats['data']
            max_date = max(data.keys())
            result[dcid] = data[max_date]
    return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_stats_wrapper(places_str, stat_vars_str):
    """Wrapper function to get stats for multiple places and give stat var.

    This wrapper takes concatenated place dcids as a string argument so the
    flask cache can work.

    Args:
        places_str: place dcids concatenated by "^".
        stat_var: the dcid of the statistical variable.
    Returns:
        An serialized json str. The json is an object keyed by the place dcid
        with value to be the observation time series.
    """
    places = places_str.split('^')
    stat_vars = stat_vars_str.split('^')
    result = dc.get_stat_set_series(places, stat_vars)['data']
    return json.dumps(result)


@bp.route('/api/stats', methods=['POST'])
def stats():
    """Handler to get the time series given stat vars for multiple places.

    This uses the get_stats_wrapper function so the result can be cached.

    Returns:
        An object keyed by the place dcid and then keyed by stat var dcid of
        observation time series.
    """
    places = sorted(request.json.get('places', []))
    stat_vars = sorted(request.json.get('statVars', []))
    result = get_stats_wrapper('^'.join(places), '^'.join(stat_vars))
    return Response(result, 200, mimetype='application/json')


@bp.route('/api/stats/stats-var-property')
def stats_var_property():
    """Handler to get the properties of give statistical variables.

    Returns:
        A dictionary keyed by stats var dcid with value being a dictionary of
        all the properties of each stats var.
    """
    dcids = request.args.getlist('dcid')
    result = stats_var_property_wrapper(dcids)
    return Response(json.dumps(result), 200, mimetype='application/json')


def stats_var_property_wrapper(dcids):
    """Function to get properties for give statistical variables."""
    data = dc.fetch_data('/node/triples', {
        'dcids': dcids,
    },
                         compress=False,
                         post=True)
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
        st = ''
        name = dcid
        for triple in triples:
            if triple['predicate'] == 'measuredProperty':
                mprop = triple['objectId']
            if triple['predicate'] == 'populationType':
                pt = triple['objectId']
            if triple['predicate'] == 'measurementDenominator':
                md = triple['objectId']
            if triple['predicate'] == 'statType':
                st = triple['objectId']
            if triple['predicate'] == 'name':
                name = triple['objectValue']
            if triple['predicate'] in pvs:
                pvs[triple['predicate']] = triple['objectId']

        result[dcid] = {
            'mprop': mprop,
            'pt': pt,
            'md': md,
            'st': st,
            'pvs': pvs,
            'title': name,
        }
    return result


@bp.route('/api/stats/value')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_stats_value():
    """Returns a value for a place based on a statistical variable.

    Sends the request to the Data Commons "/stat/value" API.
    See https://docs.datacommons.org/api/rest/stat_value.html.

    Returns:
        Singleton dict with key "value".
    """
    place = request.args.get("place")
    stat_var = request.args.get("stat_var")
    date = request.args.get("date")
    measurement_method = request.args.get("measurement_method")
    observation_period = request.args.get("observation_period")
    unit = request.args.get("unit")
    scaling_factor = request.args.get("scaling_factor")
    return Response(json.dumps(
        dc.get_stats_value(place, stat_var, date, measurement_method,
                           observation_period, unit, scaling_factor)),
                    200,
                    mimetype='application/json')


@bp.route('/api/stats/within-place')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_stat_set_within_place():
    """Gets the statistical variable values for child places of a certain place
    type contained in a parent place at a given date. If no date given, will
    return values for most recent date.

    Returns:
        Dict keyed by statvar DCIDs with dicts as values. See `SourceSeries` in
        https://github.com/datacommonsorg/mixer/blob/master/proto/mixer.proto
        for the definition of the inner dicts. In particular, the values for "val"
        are dicts keyed by child place DCIDs with the statvar values as values.
    """
    parent_place = request.args.get("parent_place")
    if not parent_place:
        return Response(json.dumps("error: must provide a parent_place field"),
                        400,
                        mimetype='application/json')
    child_type = request.args.get("child_type")
    if not child_type:
        return Response(json.dumps("error: must provide a child_type field"),
                        400,
                        mimetype='application/json')
    stat_vars = request.args.getlist("stat_vars")
    if not stat_vars:
        return Response(json.dumps("error: must provide a stat_vars field"),
                        400,
                        mimetype='application/json')
    date = request.args.get("date")
    return Response(json.dumps(
        dc.get_stat_set_within_place(parent_place, child_type, stat_vars,
                                     date)['data']),
                    200,
                    mimetype='application/json')


@bp.route('/api/stats/set', methods=["POST"])
def get_stats_set():
    dcids = request.json.get("places")
    stat_vars = request.json.get("stat_vars")
    return Response(json.dumps(dc.get_stats_set(dcids, stat_vars)),
                    200,
                    mimetype="application/json")


@bp.route('/api/stats/all')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_stats_all():
    dcids = request.args.get("places")
    stat_vars = request.args.get("statVars")
    return Response(json.dumps(dc.get_stats_all(dcids, stat_vars)),
                    200,
                    mimetype="application/json")


@bp.route('/api/stats/stat-var-summary', methods=["POST"])
def get_statvar_summary():
    """Gets the summaries for a list of stat vars.
    """
    stat_vars = request.json.get("statVars")
    result = dc.get_statvar_summary(stat_vars)
    return Response(json.dumps(result.get("statVarSummary", {})),
                    200,
                    mimetype='application/json')
