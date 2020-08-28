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


@bp.route('/config/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def config(dcid):
    """
    Get chart config for a given place.
    """
    all_stats_vars = set(place_api.statsvars(dcid))

    # Build the chart config by filtering the source configuration based on
    # available statistical variables.
    cc = []
    for src_section in current_app.config['CHART_CONFIG']:
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
        # Only keep latest data if possible
        for place in cached_chart_data:
            for sv in cached_chart_data[place]:
                if not sv in sv_keep_all_dates:
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
