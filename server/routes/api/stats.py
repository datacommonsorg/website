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
import csv
import io
import re

from flask import Blueprint, current_app, request, Response, make_response
from cache import cache
from routes.api.shared import cached_name
import services.ai as ai
import services.datacommons as dc

# Define blueprint
bp = Blueprint("stats", __name__)

# Temporary fix for messy svgs. Remove once svgs have been fixed. SVGs that are
# blocklisted here must be part of either blocklistedSvgIds or miscellaneousSvgIds
# in the mixer file /internal/server/statvar/statvar_hierarchy_util.go
BLOCKLISTED_STAT_VAR_GROUPS = {
    "dc/g/Establishment_Industry", "dc/g/Uncategorized"
}
UPDATE_NUM_DESCENDENTS_SVG = {"dc/g/Establishment", "dc/g/Employment"}
NUM_DESCENDENTS_TO_SUBTRACT = 12123

# TODO(shifucun): add unittest for this module


def get_stats_latest(dcid_str, stat_var):
    """ Returns the most recent data as from a DataCommons API payload.
    Args:
        dcid_str: place dcids concatenated by "^".
        stats_var: the dcid of the statistical variable.
    Returns:
        An object keyed by dcid, with the most recent value available for
        that dcid.
    """
    response = json.loads(get_stats_wrapper(dcid_str, stat_var))
    result = {}
    for dcid, stats in response.items():
        if (not stats or not 'data' in stats or stat_var not in stats['data'] or
                'val' not in stats['data'][stat_var]):
            result[dcid] = 0
        else:
            data = stats['data'][stat_var]['val']
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
        stat_vars_str: stat var dcids concatenated by "^".
    Returns:
        An object keyed by the place dcid with values keyed by the stat var dcid
        with value to be the time series data.
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
    """Function to get properties for given statistical variables."""
    data = dc.fetch_data('/node/triples', {
        'dcids': dcids,
    },
                         compress=False,
                         post=True)
    ranked_statvars = current_app.config['RANKED_STAT_VARS']
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
        mq = ''
        name = dcid
        for triple in triples:
            predicate = triple['predicate']
            objId = triple.get('objectId', '')
            objVal = triple.get('objectValue', '')
            if predicate == 'measuredProperty':
                mprop = objId
            if predicate == 'populationType':
                pt = objId
            if predicate == 'measurementDenominator':
                md = objId
            if predicate == 'statType':
                st = objId
            if predicate == 'name':
                name = objVal
            if predicate == 'measurementQualifier':
                mq = objId
            if predicate in pvs:
                pvs[predicate] = objId if objId else objVal

        result[dcid] = {
            'mprop': mprop,
            'pt': pt,
            'md': md,
            'st': st,
            'mq': mq,
            'pvs': pvs,
            'title': name,
            'ranked': dcid in ranked_statvars
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
                                     date)),
                    200,
                    mimetype='application/json')


@bp.route('/api/stats/within-place/all')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_stat_set_within_place_all():
    """Gets the statistical variable values for child places of a certain place
    type contained in a parent place at a given date. If no date given, will
    return values for most recent date.

    This API returns the values for all sources.
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
        dc.get_stat_set_within_place_all(parent_place, child_type, stat_vars,
                                         date)),
                    200,
                    mimetype='application/json')


@bp.route('/api/stats/set/series/within-place')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_stat_set_series_within_place():
    """Gets the statistical variable series for child places of a certain place
    type contained in a parent place.
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
    return Response(json.dumps(
        dc.get_stat_set_series_within_place(parent_place, child_type,
                                            stat_vars).get('data', {})),
                    200,
                    mimetype='application/json')


@bp.route('/api/stats/set', methods=["POST"])
def get_stats_set():
    places = request.json.get("places")
    stat_vars = request.json.get("stat_vars")
    date = request.json.get("date")
    return Response(json.dumps(dc.get_stat_set(places, stat_vars, date)),
                    200,
                    mimetype="application/json")


@bp.route('/api/stats/all')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_stats_all():
    dcids = request.args.getlist("places")
    stat_vars = request.args.getlist("statVars")
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


@bp.route('/api/stats/propvals/<string:prop>/<path:dcids>')
def get_property_value(dcids, prop):
    """Returns the property values for given node dcids and property label."""
    response = dc.get_property_values(dcids.split('^'), prop)
    return Response(json.dumps(response), 200, mimetype='application/json')


@bp.route('/api/stats/stat-var-search')
@cache.cached(timeout=3600 * 24, query_string=True)
def search_statvar():
    """Gets the statvars and statvar groups that match the tokens in the query
    """
    query = request.args.get("query")
    places = request.args.getlist("places")
    sv_only = request.args.get("svOnly", False)
    result = dc.search_statvar(query, places, sv_only)
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/api/stats/stat-var-search-ai')
@cache.cached(timeout=3600 * 24, query_string=True)
def search_statvar_ai():
    """Gets the statvars and statvar groups that match the tokens in the query
    """
    query = request.args.get("query")
    result = ai.search(current_app.config["AI_CONTEXT"], query)
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/api/stats/stat-var-group')
@cache.cached(timeout=3600 * 24, query_string=True)
def get_statvar_group():
    """Gets the stat var group node information.

    This is to retrieve the adjacent nodes, including child stat vars, child stat
    var groups and parent stat var groups for the given stat var group node.
    """
    stat_var_group = request.args.get("stat_var_group")
    entities = request.args.getlist("entities")
    result = dc.get_statvar_group(stat_var_group, entities)
    if current_app.config["ENABLE_BLOCKLIST"]:
        childSVG = result.get("childStatVarGroups", [])
        filteredChildSVG = []
        for svg in childSVG:
            svg_id = svg.get("id", "")
            if svg_id in BLOCKLISTED_STAT_VAR_GROUPS:
                continue
            svg_num_descendents = svg.get("descendentStatVarCount", 0)
            if svg_id in UPDATE_NUM_DESCENDENTS_SVG and svg_num_descendents > NUM_DESCENDENTS_TO_SUBTRACT:
                svg["descendentStatVarCount"] = svg_num_descendents - NUM_DESCENDENTS_TO_SUBTRACT
            filteredChildSVG.append(svg)
        result["childStatVarGroups"] = filteredChildSVG
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/api/stats/stat-var-path')
@cache.cached(timeout=3600 * 24, query_string=True)
def get_statvar_path():
    """Gets the path of a stat var to the root of the stat var hierarchy.
    """
    id = request.args.get("id")
    result = dc.get_statvar_path(id)
    return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/api/stat/date/within-place')
@cache.cached(timeout=3600 * 24, query_string=True)
def get_place_stat_date_within_place():
    """
    Given ancestor place, child place type and stat vars, return the dates that
	have data for each stat var across all child places.
    """
    ancestor_place = request.args.get('ancestorPlace')
    if not ancestor_place:
        return Response(json.dumps('error: must provide a ancestorPlace field'),
                        400,
                        mimetype='application/json')
    child_place_type = request.args.get('childPlaceType')
    if not child_place_type:
        return Response(
            json.dumps('error: must provide a childPlaceType field'),
            400,
            mimetype='application/json')
    stat_vars = request.args.getlist('statVars')
    if not stat_vars:
        return Response(json.dumps('error: must provide a statVars field'),
                        400,
                        mimetype='application/json')
    response = dc.fetch_data('/v1/stat/date/within-place',
                             req_json={
                                 'ancestor_place': ancestor_place,
                                 'childPlaceType': child_place_type,
                                 'stat_vars': stat_vars,
                             },
                             compress=False,
                             post=False,
                             has_payload=False)
    return Response(json.dumps(response), 200, mimetype='application/json')


def get_variable_facets_from_series(series_response):
    """
    Gets the available facets for each sv in an api response for series_within.

    Args:
        series_response: the response from a dc.series_within call.
    
    Returns:
        a dict of sv to dict of facet id to facet information:
            {
                [sv]: {
                    [facet1]: {
                        "importName": "Census",
                        "observationPeriod": "P1Y",
                        ...
                    },
                    ...
                },
                ...
            }
    """
    facets_by_variable = {}
    facets = series_response.get("facets", {})
    for sv_obs in series_response.get("observationsByVariable", []):
        sv = sv_obs.get("variable")
        facets_by_variable[sv] = {}
        for place_obs in sv_obs.get("observationsByEntity", []):
            for facet_obs in place_obs.get("seriesByFacet", []):
                facet = str(facet_obs.get("facet", ""))
                if facet and not facet in facets_by_variable[sv]:
                    facets_by_variable[sv][facet] = facets.get(facet, {})
    return facets_by_variable


def get_variable_facets_from_points(points_response):
    """
    Gets the available facets for each sv in an api response for points_within.

    Args:
        points_response: the response from a dc.points_within call.
    
    Returns:
        a dict of sv to dict of facet id to facet information:
            {
                [sv]: {
                    [facet1]: {
                        "importName": "Census",
                        "observationPeriod": "P1Y",
                        ...
                    },
                    ...
                },
                ...
            }
    """
    facets_by_variable = {}
    facets = points_response.get("facets", {})
    for sv_obs in points_response.get("observationsByVariable", []):
        sv = sv_obs.get("variable")
        facets_by_variable[sv] = {}
        for place_obs in sv_obs.get("observationsByEntity", []):
            for facet_obs in place_obs.get("pointsByFacet", []):
                facet = str(facet_obs.get("facet", ""))
                if not facet in facets_by_variable[sv]:
                    facets_by_variable[sv][facet] = facets.get(facet, {})
    return facets_by_variable


@bp.route('/api/stats/facets/within-place', methods=['POST'])
def get_facets_within_place():
    """
    Gets the available facets for a list of stat vars for places of a specific
    type within a parent place. If minDate and maxDate are "latest",
    the latest date facets will be returned.

    Request body:
        parentPlace: the parent place of the places to get facets for
        childType: type of places to get facets for
        statVars: list of statistical variables to get facets for
        minDate (optional): earliest date to get facets for
        maxDate (optional): latest date to get facets for

    Returns a dict of sv to dict of facet id to facet information:
    {
        [sv]: {
            [facet1]: {
                "importName": "Census",
                "observationPeriod": "P1Y",
                ...
            },
            ...
        },
        ...
    }
    """
    parent_place = request.json.get('parentPlace')
    if not parent_place:
        return 'error: must provide a parentPlace field', 400
    child_type = request.json.get('childType')
    if not child_type:
        return 'error: must provide a childType field', 400
    stat_vars = request.json.get('statVars')
    if not stat_vars:
        return 'error: must provide a statVars field', 400
    min_date = request.json.get('minDate')
    if not is_valid_get_csv_date(min_date):
        return 'error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD', 400
    max_date = request.json.get('maxDate')
    if not is_valid_get_csv_date(max_date):
        return 'error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD', 400
    # when min_date and max_date are the same and non empty, we will get the
    # points data, otherwise we will get series data
    if min_date and max_date and min_date == max_date:
        date = min_date
        if min_date == "latest":
            date = ""
        points_response = dc.points_within(parent_place, child_type, stat_vars,
                                           date, True)
        return get_variable_facets_from_points(points_response), 200
    else:
        series_response = dc.series_within(parent_place, child_type, stat_vars,
                                           True)
        return get_variable_facets_from_series(series_response), 200


def get_points_within_csv_rows(parent_place,
                               child_type,
                               sv_list,
                               facet_map,
                               date,
                               row_limit=None):
    """
    Gets the csv rows for a set of statistical variables data for child places
    of a certain place type contained in a parent place.

    Args:
        parent_place: the parent place of the places to get data for
        child_type: the type of places to get data for
        sv_list: list of variables in the order that they should appear from
            left to right in each csv row.
        date: the date to get the data for
        row_limit (optional): number of csv rows to return

    Returns:
        An array where each item in the array is a csv row. These csv rows are
        represented as an array where each item is the value of a cell in the
        row.
    """
    points_response_all = dc.points_within(parent_place, child_type, sv_list,
                                           date, True)
    points_response_best = {}
    # Set of stat vars where we need to make a separate call to
    # dc.points_within to get the data points of the latest date and best facet
    sv_latest_best_point = set()
    if date == "":
        for sv in sv_list:
            if facet_map.get(sv, "") == "":
                sv_latest_best_point.add(sv)
        if len(sv_latest_best_point) > 0:
            points_response_best = dc.points_within(parent_place, child_type,
                                                    list(sv_latest_best_point),
                                                    date, False)
    # dict of place dcid to dict of sv dcid to chosen data point.
    data_by_place = {}
    # go through the data in points_response_best and add to data_by_place
    for sv_data in points_response_best.get("observationsByVariable", []):
        sv = sv_data.get("variable")
        for place_data in sv_data.get("observationsByEntity", []):
            place = place_data.get("entity")
            if not place in data_by_place:
                data_by_place[place] = {}
            # points_response_best should just have a single best (latest date
            # and best facet) data point for each stat var and place
            if len(place_data.get("pointsByFacet")) > 0:
                data_by_place[place][sv] = place_data.get("pointsByFacet")[0]
    # go through the data in points_response_all and add to data_by_place
    for sv_data in points_response_all.get("observationsByVariable", []):
        sv = sv_data.get("variable")
        # points_response_all has data for all stat vars, but we want to skip
        # the stat vars that are included in points_response_best
        if sv in sv_latest_best_point:
            continue
        target_facet = facet_map.get(sv, "")
        for place_data in sv_data.get("observationsByEntity", []):
            place = place_data.get("entity")
            if not place in data_by_place:
                data_by_place[place] = {}
            points_by_facet = place_data.get("pointsByFacet", [])
            for point in points_by_facet:
                # if no facet selected for this variable, choose the first
                # point in the list because pointsByFacet is sorted by best
                # facet first
                if target_facet == "":
                    data_by_place[place][sv] = point
                    break
                if str(point.get("facet")) == target_facet:
                    data_by_place[place][sv] = point
                    break
    facet_info = points_response_all.get("facets", {})
    place_list = sorted(list(data_by_place.keys()))
    place_names = cached_name("^".join(place_list))
    result = []
    for place, place_name in place_names.items():
        if row_limit and len(result) >= row_limit:
            break
        place_row = [place, place_name]
        for sv in sv_list:
            data = data_by_place.get(place, {}).get(sv, {})
            date = data.get("date", "")
            value = data.get("value", "")
            facetId = data.get("facet", "")
            facet = facet_info.get(str(facetId), {}).get("provenanceUrl", "")
            place_row.extend([date, value, facet])
        result.append(place_row)
    return result


def date_greater_equal_min(date, min_date):
    """
    Returns whether or not date is considered greater than or equal to min_date.
    A date is considered greater than or equal to min date if:
        1. there is no min date
        2. date is same granularity as min date and an equal or later date
        3. date is lower granularity and min date is either within date or date
            is later (eg. min date is 2015-01 and date is 2015)
        4. date is higher granularity and date is either within min date or
            later (eg. min date is 2015 and date is 2015-01)

    """
    if not date:
        return False
    return not min_date or date >= min_date or date in min_date


def date_lesser_equal_max(date, max_date):
    """
    Returns whether or not date is considered less than or equal to max_date.
    A date is considered less than or equal to max date if:
        1. there is no max date
        2. date is same granularity as max date and an equal or earlier date
        3. date is lower granularity and max date is either within date or date
            is earlier (eg. max date is 2015-01 and date is 2015)
        4. date is higher granularity and date is either within max date or
            earlier (eg. max date is 2015 and date is 2015-01)

    """
    if not date:
        return False
    return not max_date or date <= max_date or max_date in date


def get_series_csv_rows(series_response,
                        sv_list,
                        facet_map,
                        min_date,
                        max_date,
                        row_limit=None):
    """
    Gets the csv rows for a set of statistical variable series for a certain
    date range.

    Args:
        series_response: the response from a dc.series_within call
        sv_list: list of variables in the order that they should appear from
            left to right in each csv row.
        min_date (optional): the earliest date as a string to get data for. If
            not set get all dates up to max_date (if max_date is set).
        max_date (optional): the latest date as a string to get data for. If not
            set, get all dates starting at min_date (if min_date is set).
        row_limit (optional): number of csv rows to return

    Returns:
        An array where each item in the array is a csv row. These csv rows are
        represented as an array where each item is the value of a cell in the
        row.
    """
    facets = series_response.get("facets", {})
    obs_by_sv = series_response.get("observationsByVariable", [])
    # dict of place dcid to dict of sv dcid to chosen series.
    data_by_place = {}
    for sv_data in obs_by_sv:
        sv = sv_data.get("variable")
        target_facet = facet_map.get(sv, "")
        for place_data in sv_data.get("observationsByEntity", []):
            place = place_data.get("entity")
            series_by_facet = place_data.get("seriesByFacet", [])
            if not place in data_by_place:
                data_by_place[place] = {}
            for series in series_by_facet:
                # if no facet selected for this variable, choose the first
                # series in the list because seriesByFacet is sorted by best
                # facet first
                if target_facet == "":
                    data_by_place[place][sv] = series
                    break
                if str(series.get("facet")) == target_facet:
                    data_by_place[place][sv] = series
                    break
    place_list = sorted(list(data_by_place.keys()))
    place_names = cached_name("^".join(place_list))
    result = []
    for place, place_name in place_names.items():
        # dict of sv to sorted list of data points available for the sv and is within
        # the date range
        sv_data_points = {}
        # dict of sv to its source
        sv_source = {}
        # dict of sv to the idx of the next date for that sv to add to the result
        sv_curr_index = {}
        # whether or not there is still data to add to the result
        have_data = False
        for sv in sv_list:
            sv_series = data_by_place.get(place, {}).get(sv, {})
            want_data_points = []
            # Go through the series and keep data points that are within the
            # date range
            for data_point in sv_series.get("series", []):
                date = data_point.get("date")
                is_greater_than_min = date_greater_equal_min(date, min_date)
                is_less_than_max = date_lesser_equal_max(date, max_date)
                if is_greater_than_min and is_less_than_max:
                    want_data_points.append(data_point)
            want_data_points.sort(key=lambda x: x["date"])
            sv_data_points[sv] = want_data_points
            facetId = sv_series.get("facet", "")
            sv_source[sv] = facets.get(str(facetId),
                                       {}).get("provenanceUrl", "")
            sv_curr_index[sv] = 0
            have_data = have_data or len(want_data_points) > 0
        while have_data:
            if row_limit and len(result) >= row_limit:
                break
            curr_date = ""
            # look through all the next dates to add data for and choose the
            # earliest date and the one with highest granularity
            # eg. between 2015 and 2015-01 we want 2015-01
            #     between 2015 and 2016 we want 2015
            for sv, idx in sv_curr_index.items():
                if idx >= len(sv_data_points[sv]):
                    continue
                curr_sv_date = sv_data_points[sv][idx]["date"]
                if not curr_date:
                    curr_date = curr_sv_date
                elif curr_sv_date < curr_date or curr_sv_date.startswith(
                        curr_date):
                    curr_date = curr_sv_date
            have_data = False
            place_date_row = [place, place_name]
            for sv, idx in sv_curr_index.items():
                # if a sv doesn't have any more data left, just append empty cells
                if idx >= len(sv_data_points[sv]):
                    place_date_row.extend(["", "", ""])
                    continue
                curr_sv_date = sv_data_points[sv][idx]["date"]
                # Add data for an sv if the current date to add for that sv is
                # equal to or encompassing the chosen date. Eg. if the chosen
                # date is 2015-01-02, then we can add data from 2015, 2015-01 or
                # 2015-01-02.
                if curr_date.startswith(curr_sv_date):
                    value = sv_data_points[sv][idx]["value"]
                    place_date_row.extend(
                        [curr_sv_date, value,
                         sv_source.get(sv, "")])
                    sv_curr_index[sv] += 1
                else:
                    place_date_row.extend(["", "", ""])
                have_data = have_data or sv_curr_index[sv] < len(
                    sv_data_points[sv])
            result.append(place_date_row)
    return result


def is_valid_get_csv_date(date):
    """
    Returns whether or not the date string is valid. Valid date strings are:
        1. empty or
        2. "latest" or
        3. of the form "YYYY" or "YYYY-MM" or "YYYY-MM-DD"
    """
    if not date or date == "latest" or re.match(r"^(\d\d\d\d)(-\d\d)?(-\d\d)?$",
                                                date):
        return True
    return False


@bp.route('/api/stats/csv/within-place', methods=['POST'])
def get_stats_within_place_csv():
    """Gets the statistical variable data as a csv for child places of a
    certain place type contained in a parent place. If no date range specified,
    gets data for all dates of a series. If minDate and maxDate are "latest",
    the latest date data will be returned.

    Request body:
        parentPlace: the parent place of the places to get data for
        childType: type of places to get data for
        statVars: list of statistical variables to get data for
        minDate (optional): earliest date to get data for
        maxDate (optional): latest date to get data for
        facetMap (optional): map of statistical variable dcid to the id of the
            facet to get data from
        rowLimit (optional): number of csv rows to return
    """
    parent_place = request.json.get("parentPlace")
    if not parent_place:
        return "error: must provide a parentPlace field", 400
    child_type = request.json.get("childType")
    if not child_type:
        return "error: must provide a childType field", 400
    sv_list = request.json.get("statVars")
    if not sv_list:
        return "error: must provide a statVars field", 400
    min_date = request.json.get("minDate")
    if not is_valid_get_csv_date(min_date):
        return "error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD", 400
    max_date = request.json.get("maxDate")
    if not is_valid_get_csv_date(max_date):
        return "error: minDate must be YYYY or YYYY-MM or YYYY-MM-DD", 400
    facet_map = request.json.get("facetMap", {})
    row_limit = request.json.get("rowLimit")
    if row_limit:
        row_limit = int(row_limit)
    result_csv = []
    header_row = ["placeDcid", "placeName"]
    for sv in sv_list:
        header_row.extend(["Date:" + sv, "Value:" + sv, "Source:" + sv])
    result_csv.append(header_row)
    # when min_date and max_date are the same and non empty, we will get the
    # data for that one date
    if min_date and max_date and min_date == max_date:
        points_response_best = {}
        date = min_date
        if min_date == "latest":
            date = ""
        result_csv.extend(
            get_points_within_csv_rows(parent_place, child_type, sv_list,
                                       facet_map, date, row_limit))
    else:
        series_response = dc.series_within(parent_place, child_type, sv_list,
                                           True)
        result_csv.extend(
            get_series_csv_rows(series_response, sv_list, facet_map, min_date,
                                max_date, row_limit))
    si = io.StringIO()
    csv_writer = csv.writer(si)
    csv_writer.writerows(result_csv)
    response = make_response(si.getvalue())
    response.headers["Content-type"] = "text/csv"
    response.headers[
        "Content-Disposition"] = "attachment; filename={}_{}.csv".format(
            parent_place, child_type)
    response.status_code = 200
    return response
