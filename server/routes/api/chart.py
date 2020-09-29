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
"""This module defines the routes for retrieving chart config and metadata
for the Place Explorer.

The client side will request chart configuration including chart type,
statistical variables, etc. from endpoints in this module.
"""

import copy
import json
import urllib
import services.datacommons as dc_service
import routes.api.place as place_api
import os
import routes.api.choropleth as choropleth_api

from cache import cache
from flask import Blueprint, current_app, Response, url_for, jsonify
from routes.api.place import EQUIVALENT_PLACE_TYPES
# Define blueprint
bp = Blueprint("api_chart", __name__, url_prefix='/api/chart')

# Place type to get choropleth for, keyed by place type
# TODO: Come up with a catch all way to determine place type to get choropleth for because
# this works for US places, but hierarchy of places in other countries may be different
CHOROPLETH_DISPLAY_LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2"
}


def filter_charts(charts, all_stats_vars):
    """Filter charts from template specs based on statsitical variable.

    The input charts might have statistical variables that do not exist in the
    valid statistical variable set for a given place. This function filters and
    keep the ones that are valid.

    Args:
        charts: An array of chart specs.
        all_stats_vars: All valid statistical variable that can be used.

    Returns:
        An array of chart specs that could be used.
    """
    result = []
    for chart in charts:
        chart_copy = copy.copy(chart)
        chart_copy['statsVars'] = [
            x for x in chart['statsVars'] if x in all_stats_vars
        ]
        if chart_copy['statsVars']:
            result.append(chart_copy)
    return result


def build_url(dcid, stats_vars):
    anchor = '&place={}&statsVar={}'.format(dcid, '__'.join(stats_vars))
    return urllib.parse.unquote(url_for('tools.timeline', _anchor=anchor))


# TODO(shifucun): This function can be removed since data for all dates are
# used.
def get_statsvars_need_all_dates(chart_list):
    """Pulls out stats vars from the list of chart configs that require all dates kept
    i.e., line charts sv's

    Args:
        chart_list: List of charts objects (keyed "charts" in the chart_config.json

    Returns:
        Set of stats vars that should be kept
    """
    result = set()
    for chart in chart_list:
        for sv in chart['statsVars']:
            result.add(sv)
    return result


def keep_latest_data(timeseries):
    """Only keep the latest timestamped data from the timeseries

    Args:
        timeseries: GetStats timeseries, dictionary of date: value

    Returns:
        GetStats timeseries with only one date/value, or None
    """
    if not timeseries:
        return None
    max_date = max(timeseries)
    return {max_date: timeseries[max_date]}


def keep_specified_data(timeseries, dates):
    """Only keep the timestamped data from the timeseries specified by the set of dates

    Args:
        timeseries: GetStats timeseries, dictionary of date: value
        dates: set of dates needed for this timeseries

    Returns:
        dictionary of date: value
    """
    data = {}
    for date in dates:
        data[date] = timeseries[date]
    return data


def get_landing_page_data(dcid):
    response = dc_service.fetch_data('/node/landing-page', {
        'dcids': [dcid],
    },
                                     compress=False,
                                     post=True,
                                     has_payload=True)
    return response


def get_latest_common_date_for_chart(chart, sv_data):
    """Get the latest date for which there is data for every stat var included in this chart if there is such date

    Args:
        chart: the chart object that we currently care about (a single chart object from chart_config.json)
        sv_data: the object returned from get_landing_page_data

    Returns:
        date as a string or None
    """
    dates = set()
    dates_initialized = False
    for sv in chart['statsVars']:
        if sv in sv_data:
            if dates_initialized:
                dates = dates.intersection(sv_data[sv]['data'])
            else:
                dates.update(sv_data[sv]['data'])
        dates_initialized = True
    sorted_dates = sorted(dates)
    date_to_add = None
    if len(sorted_dates) > 0:
        date_to_add = sorted_dates[-1]
    return date_to_add


# TODO(shifucun): This function can be removed since data for all dates are
# used.
def get_dates_for_stat_vars(chart_config, sv_data):
    """For each stat var, get the list of dates needed for every chart it is involved in. List of dates needed are a
    list of the latest date for which every stat var in a chart has data for or the latest date that stat var has data for.

    Args:
        chart_config: the chart config from chart_config.json
        sv_data: the object returned from get_landing_page_data

    Returns:
        dictionary of statVar: list of dates

    """
    sv_dates = {}

    for topic in chart_config:
        for chart in topic['charts']:
            date_to_add = get_latest_common_date_for_chart(chart, sv_data)
            for sv in chart['statsVars']:
                if sv in sv_data:
                    curr_date_to_add = date_to_add
                    if date_to_add is None:
                        curr_date_to_add = max(sv_data[sv]['data'])
                    if not sv in sv_dates:
                        sv_dates[sv] = set()
                    sv_dates[sv].add(curr_date_to_add)
        for section in topic['children']:
            for chart in section['charts']:
                date_to_add = get_latest_common_date_for_chart(chart, sv_data)
                for sv in chart['statsVars']:
                    if sv in sv_data:
                        curr_date_to_add = date_to_add
                        if date_to_add is None:
                            curr_date_to_add = max(sv_data[sv]['data'])
                        if not sv in sv_dates:
                            sv_dates[sv] = set()
                        sv_dates[sv].add(curr_date_to_add)
    return sv_dates


def build_config(raw_config):
    """Builds hierachical config based on raw config."""
    category_map = {}
    for conf in raw_config:
        config = copy.deepcopy(conf)
        is_overview = ('isOverview' in config and config['isOverview'])
        # isOverview field is not used in the built chart config.
        if 'isOverview' in config:
            del config['isOverview']
        category, _ = config['category']
        del config['category']
        if category not in category_map:
            category_map[category] = {
                'label': category,
                'charts': [],
                'children': []
            }
        if is_overview:
            category_map[category]['charts'].append(config)
        # Turn each chart into a new topic since we render multiple types per
        # chart
        category_map[category]['children'].append({
            'label': config['title'],
            'charts': [config]
        })
    return list(category_map.values())


@bp.route('/data/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def config(dcid):
    """
    Get chart config and cache data for a given place.
    """
    raw_config = current_app.config['CHART_CONFIG']
    chart_config = build_config(raw_config)

    all_stats_vars = set(place_api.statsvars(dcid))

    # Build the chart config by filtering the source configuration based on
    # available statistical variables.
    cc = []
    for src_section in chart_config:
        target_section = {
            "label":
                src_section["label"],
            "charts":
                filter_charts(src_section.get('charts', []), all_stats_vars),
            "children": []
        }
        for child in src_section.get('children', []):
            child_charts = filter_charts(child['charts'], all_stats_vars)
            if child_charts:
                target_section['children'].append({
                    'label': child["label"],
                    'charts': child_charts
                })
        if target_section['charts'] or target_section['children']:
            cc.append(target_section)

    # Track stats vars where we need data from all dates (i.e. line charts)
    sv_keep_all_dates = set()
    for topic in cc:
        sv_keep_all_dates.update(get_statsvars_need_all_dates(topic['charts']))
        for section in topic['children']:
            sv_keep_all_dates.update(
                get_statsvars_need_all_dates(section['charts']))

    # Add cached chart data available
    # TODO: Request uncached data from the mixer
    chart_stats_vars = get_landing_page_data(dcid)

    cached_chart_data = {}
    if chart_stats_vars.get(dcid) and len(chart_stats_vars[dcid]):
        cached_chart_data = chart_stats_vars
        # Only keep data for the specified dates or latest date if possible
        for place in cached_chart_data:
            sv_dates = get_dates_for_stat_vars(cc, cached_chart_data[place])
            for sv in cached_chart_data[place]:
                if not sv in sv_keep_all_dates:
                    if sv in sv_dates:
                        cached_chart_data[place][sv][
                            'data'] = keep_specified_data(
                                cached_chart_data[place][sv]['data'],
                                sv_dates[sv])
                    else:
                        cached_chart_data[place][sv]['data'] = keep_latest_data(
                            cached_chart_data[place][sv]['data'])

    # Populate the GNI url for each chart.
    for i in range(len(cc)):
        # Populate gni url for charts
        for j in range(len(cc[i]['charts'])):
            cc[i]['charts'][j]['exploreUrl'] = build_url(
                dcid, cc[i]['charts'][j]['statsVars'])
        # Populate gni url for children
        for j in range(len(cc[i].get('children', []))):
            for k in range(len(cc[i]['children'][j]['charts'])):
                cc[i]['children'][j]['charts'][k]['exploreUrl'] = build_url(
                    dcid, cc[i]['children'][j]['charts'][k]['statsVars'])

    response = {
        'config': cc,
        'data': cached_chart_data,
    }

    return Response(json.dumps(response), 200, mimetype='application/json')


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_choropleth_places(geoDcid):
    """ Get the list of places to show on a choropleth chart for a given place

    Args:
        geoDcid: dcid of the place of interest
    
    Returns:
        list of dcids
    """
    result = []
    place_type = place_api.get_place_type(geoDcid)
    display_level = None
    if place_type in CHOROPLETH_DISPLAY_LEVEL_MAP:
        display_level = CHOROPLETH_DISPLAY_LEVEL_MAP[place_type]
    elif place_type in EQUIVALENT_PLACE_TYPES and EQUIVALENT_PLACE_TYPES[
            place_type] in CHOROPLETH_DISPLAY_LEVEL_MAP:
        place_type = EQUIVALENT_PLACE_TYPES[place_type]
        display_level = CHOROPLETH_DISPLAY_LEVEL_MAP[place_type]
    else:
        return result
    result = dc_service.get_places_in([geoDcid], display_level).get(geoDcid, [])
    return result


@bp.route('/geojson/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def geojson(dcid):
    """
    Get geoJson data for a given place
    """
    geos = get_choropleth_places(dcid)
    if not geos:
        return Response(json.dumps({}), 200, mimetype='application/json')

    names_by_geo = place_api.get_display_name('^'.join(geos))
    geojson_by_geo = dc_service.get_property_values(geos,
                                                    "geoJsonCoordinatesDP3")
    features = []
    for geo_id, json_text in geojson_by_geo.items():
        if json_text and geo_id in names_by_geo:
            geo_feature = {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPolygon",
                },
                "id": geo_id,
                "properties": {
                    "name": names_by_geo.get(geo_id, "Unnamed Area"),
                    "hasSublevel": False,
                    "geoDcid": geo_id,
                }
            }
            # Load, simplify, and add geoJSON coordinates.
            # Exclude geo if no or multiple renderings are present.
            if len(json_text) != 1:
                continue
            geojson = json.loads(json_text[0])
            geo_feature['geometry']['coordinates'] = (
                choropleth_api.coerce_geojson_to_righthand_rule(
                    geojson['coordinates'], geojson['type']))
            features.append(geo_feature)
    return Response(json.dumps({
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "current_geo": dcid
        }
    }),
                    200,
                    mimetype='application/json')


def get_choropleth_sv():
    """ Gets all the stat vars and accompanying denominators that will have a choropleth chart drawn for them
    ie. charts with the hasChoropleth property set as true

    Returns: 
        a tuple consisting of:
            set of all stat vars including both the stat vars of the charts and stat vars of denominators
            dictionary of stat var: list of denominators
    """
    chart_config = current_app.config['CHART_CONFIG']
    if os.environ.get('FLASK_ENV') == 'development':
        with bp.open_resource('../../chart_config.json') as f:
            raw_config = json.load(f)
    all_sv = set()
    sv_denom_mapping = {}
    for config in chart_config:
        if 'hasChoropleth' in config and config['hasChoropleth']:
            # we should only be making choropleths for configs with a single stat var
            sv = config['statsVars'][0]
            all_sv.add(sv)
            denom = ''
            if 'denominator' in config:
                denom = config['denominator'][0]
                all_sv.add(denom)
            elif 'perCapita' in config and config['perCapita']:
                # The denominator used for perCapita is total population
                all_sv.add('Count_Person')
                denom = 'Count_Person'
            if sv not in sv_denom_mapping:
                sv_denom_mapping[sv] = set()
            sv_denom_mapping[sv].add(denom)
    return all_sv, sv_denom_mapping


def get_data_for_statvar(sv, geos, all_sv_data):
    """ Gets all the data for a specific stat var with the source series data flattened out
    
    Args:
        sv: the stat var we are returning data for
        geos: list of place dcids we are returning data for
        all_sv_data: value of the key placeData in the object received from getStatsAll

    Returns:
        dictionary of dictionary of date: data, keyed by place dcid
    """
    result = {}
    for geo in geos:
        result[geo] = dict()
        if geo in all_sv_data and 'statVarData' in all_sv_data[geo]:
            sv_data = all_sv_data[geo]['statVarData']
            if sv not in sv_data:
                continue
            sv_data = sv_data[sv]
            if 'sourceSeries' not in sv_data:
                continue
            for source in sv_data['sourceSeries']:
                result[geo].update(source['val'])
    return result


# TODO: Update method of getting dates to ensure stat var date and denominator date matches
def get_latest_common_date_for_sv(sv_data):
    """Finds the latest common date
    
    Args:
        sv_data: dictionary of dictionary of date: data, keyed by place dcid

    Returns:
        date as a string 
    """
    common_dates = None
    all_dates = set()
    if not sv_data:
        return None
    for place, data in sv_data.items():
        if common_dates:
            common_dates = common_dates.intersection(data.keys())
        else:
            common_dates = set(data.keys())
        all_dates.update(data.keys())
    sv_date = None
    if common_dates:
        sorted_dates = sorted(common_dates)
        if len(sorted_dates) > 0:
            sv_date = sorted_dates[-1]
    if not sv_date and all_dates:
        sorted_dates = sorted(all_dates)
        if len(sorted_dates) > 0:
            sv_date = sorted_dates[-1]
    return sv_date


@bp.route('/choroplethdata/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def choropleth_data(dcid):
    """
    Get stats var data needed for choropleth charts for a given place

    API Returns:
        Dictionary with 
            key as stat var and denominator separated by '^'
            value as object with date and dictionary of place: value
    """
    all_stat_vars, sv_denoms_mapping = get_choropleth_sv()
    geos = get_choropleth_places(dcid)
    if not all_stat_vars or not geos:
        return Response(json.dumps({}), 200, mimetype='application/json')
    # Get data for all the stat vars for every place we will need
    all_sv_data = dc_service.get_stats_all(geos, list(all_stat_vars))
    if not 'placeData' in all_sv_data:
        return Response(json.dumps({}), 200, mimetype='application/json')
    all_sv_data = all_sv_data['placeData']

    result = {}
    # We have the potential of reusing denom data so keep track of what we've already seen
    # to prevent recalculation
    retrieved_denom_data = {}
    calculated_denom_date = {}
    for sv, denoms in sv_denoms_mapping.items():
        # retrieve sv data and get latest common date for current sv
        sv_data = get_data_for_statvar(sv, geos, all_sv_data)
        sv_date = get_latest_common_date_for_sv(sv_data)
        if not sv_date:
            continue
        # get result for each denom
        for denom in denoms:
            denom_data = None
            denom_date = None
            key = sv
            if denom:
                # get denom data and latest common date for the denom
                if denom in retrieved_denom_data:
                    denom_data = retrieved_denom_data[denom]
                else:
                    denom_data = get_data_for_statvar(denom, geos, all_sv_data)
                    retrieved_denom_data[denom] = denom_data
                if denom in calculated_denom_date:
                    denom_date = calculated_denom_date[denom]
                else:
                    denom_date = get_latest_common_date_for_sv(denom_data)
                    calculated_denom_date[denom] = denom_date
                if not denom_date:
                    continue
                key = key + '^' + denom
            geo_data = {}
            # calculate value for each geo for current stat var and denom combination
            for geo in geos:
                geo_data[geo] = None
                if not geo in sv_data or not sv_date in sv_data[geo]:
                    continue
                if denom_data:
                    if geo in denom_data and denom_date in denom_data[geo]:
                        geo_data[geo] = sv_data[geo][sv_date] / denom_data[geo][
                            denom_date]
                else:
                    geo_data[geo] = sv_data[geo][sv_date]
            sv_denom_result = {'date': sv_date, 'data': geo_data}
            result[key] = sv_denom_result
    return Response(json.dumps(result), 200, mimetype='application/json')
