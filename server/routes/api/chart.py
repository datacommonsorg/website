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

from cache import cache
from flask import Blueprint, current_app, Response, url_for

# Define blueprint
bp = Blueprint(
    "api_chart",
    __name__,
    url_prefix='/api/chart'
)


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
            x for x in chart['statsVars'] if x in all_stats_vars]
        if chart_copy['statsVars']:
            result.append(chart_copy)
    return result


def build_url(dcid, stats_vars):
    anchor = '&place={}&statsVar={}'.format(dcid, '__'.join(stats_vars))
    return urllib.parse.unquote(url_for('tools.timeline', _anchor=anchor))


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
        if chart['chartType'] == 'LINE' or chart.get('axis', '') == 'TIME':
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
    if not timeseries: return None
    max_date = max(timeseries)
    return { max_date: timeseries[max_date] }


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
    response = dc_service.fetch_data(
        '/node/landing-page',
        {
            'dcids': [dcid],
        },
        compress=False,
        post=True,
        has_payload=True
    )
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
    

@bp.route('/config/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def config(dcid):
    """
    Get chart config for a given place.
    """
    chart_config = current_app.config['CHART_CONFIG']
    if os.environ.get('FLASK_ENV') == 'development':
        with bp.open_resource('../../chart_config.json') as f:
            chart_config = json.load(f)

    all_stats_vars = set(place_api.statsvars(dcid))

    # Build the chart config by filtering the source configuration based on
    # available statistical variables.
    cc = []
    for src_section in chart_config:
        target_section = {
            "label": src_section["label"],
            "charts": filter_charts(
                src_section.get('charts', []), all_stats_vars),
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
            sv_keep_all_dates.update(get_statsvars_need_all_dates(section['charts']))

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
                        cached_chart_data[place][sv]['data'] = keep_specified_data(
                            cached_chart_data[place][sv]['data'], sv_dates[sv])
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
                    dcid,
                    cc[i]['children'][j]['charts'][k]['statsVars'])

    response = {
        'config': cc,
        'data': cached_chart_data,
    }

    return Response(json.dumps(response), 200, mimetype='application/json')
