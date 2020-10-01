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

import collections
import copy
import json
import random
import re
import time

from flask import Blueprint, current_app, jsonify, request, Response, url_for

from cache import cache
import services.datacommons as dc_service
from services.datacommons import fetch_data
import routes.api.stats as stats_api

import logging

# Define blueprint
bp = Blueprint("api.place.new", __name__, url_prefix='/api/place/new')


def get_landing_page_data(dcid):
    response = dc_service.fetch_data('/landing-page', {
        'place': dcid,
    },
                                     compress=False,
                                     post=True,
                                     has_payload=True)
    return response


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
def data(dcid):
    """
    Get chart config and stats data of the landing page for a given place.
    """
    raw_config = current_app.config['CHART_CONFIG']
    config = build_config(raw_config)
    cache_data = get_landing_page_data(dcid)

    # Build the reponse from config
    response = copy.deepcopy(config)

    for category in response:
        for chart in category['charts']:
            # Populate the overview page data.
            # Trend data
            series, sources = get_trend_data(chart, cache_data['data'], dcid)
            if series:
                chart['trend'] = {'series': series, 'sources': sources}
            # Parent places data
            parent_data = get_bar_data(chart, cache_data['data'],
                                       cache_data['parentPlaces'])
            if parent_data:
                chart['parent'] = parent_data
            for child in category['children']:
                for chart in child['charts']:
                    series, sources = get_trend_data(chart, cache_data['data'],
                                                     dcid)
                    if series:
                        chart['trend'] = {'series': series, 'sources': sources}

    return Response(json.dumps(response), 200, mimetype='application/json')


def get_bar_data(cc, data, places):
    """Get the bar data across a few places.

    This will scale the value if required and pick the latest date that has the
    most <place, stat_var> entries.
    """
    if not places:
        return {}
    date_to_data = collections.defaultdict(
        lambda: collections.defaultdict(list))

    denominator_stat_var = None
    if 'relatedChart' in cc and cc['relatedChart'].get('scale', False):
        denominator_stat_var = cc['relatedChart'].get('denominator',
                                                      'Count_Person')
    for place in places:
        dcid = place['dcid']
        if dcid not in data:
            continue
        for stat_var in cc['statsVars']:
            series = data[dcid].get(stat_var, {}).get('data', {})
            if not series:
                continue
            if denominator_stat_var is not None:
                denominator = data[dcid].get(denominator_stat_var,
                                             {}).get('data', {})
                if not denominator:
                    continue
                series = {k: v for k, v in scale_series(series, denominator)}
            for date, value in series.items():
                date_to_data[date][dcid].append((stat_var, value))
    dates = sorted(date_to_data.keys(), reverse=True)
    if not dates:
        return {}
    count = 0
    chosen_date = None
    for date in dates:
        if len(date_to_data[date]) > count:
            count = len(date_to_data[date])
            chosen_date = date
    result = {'date': chosen_date, 'data': []}
    for place in places:
        points = {}
        for stat_var, value in date_to_data[chosen_date][place['dcid']]:
            points[stat_var] = value
        if points:
            result['data'].append({
                'dcid': place['dcid'],
                'name': place['name'],
                'data': points
            })
    # Should have data other than the primary place. Return empty struct to
    # so client won't draw chart.
    if len(result['data']) == 1:
        return {}
    return result


def get_trend_data(cc, data, place):
    """Get the time series data for a place."""
    series = {}
    sources = set()
    if place not in data:
        return series, sources

    if 'denominator' in cc:
        if len(cc['denominator']) < len(cc['statsVars']):
            logging.error('Missing denominator in %s', cc)
            return series, sources

    for i, stat_var in enumerate(cc['statsVars']):
        numerator_raw = data[place].get(stat_var, {})
        if not numerator_raw:
            continue

        if 'denominator' in cc:
            denominator_raw = data[place].get(cc['denominator'][i], {})
            if not denominator_raw:
                continue
            series[stat_var] = scale_series(numerator_raw['data'],
                                            denominator_raw['data'])
            sources.add(numerator_raw['provenanceDomain'])
            sources.add(denominator_raw['provenanceDomain'])
        else:
            series[stat_var] = numerator_raw
            sources.add(numerator_raw['provenanceDomain'])
    return series, list(sources)


def scale_series(numerator, denominator):
    """Scale two time series.

    The date of the two time series may not be exactly aligned. Here we use
    year alignment to match two date. If no denominator is found for a
    numerator, then the data is removed.
    """
    data = {}
    for date, value in numerator.items():
        if date in denominator:
            data[date] = value / denominator[date]
        else:
            parts = date.split('-')
            if len(parts) > 1 and parts[0] in denominator:
                data[date] = value / denominator[parts[0]]
    return [(date, data[date]) for date in sorted(data.keys())]

    # Populate the timeline tool url for each chart.
    # for i in range(len(cc)):
    #     # Populate timeline tool url for charts
    #     for j in range(len(cc[i]['charts'])):
    #         cc[i]['charts'][j]['exploreUrl'] = build_url(
    #             dcid, cc[i]['charts'][j]['statsVars'])
    #     # Populate timeline tool url for children
    #     for j in range(len(cc[i].get('children', []))):
    #         for k in range(len(cc[i]['children'][j]['charts'])):
    #             cc[i]['children'][j]['charts'][k]['exploreUrl'] = build_url(
    #                 dcid, cc[i]['children'][j]['charts'][k]['statsVars'])

    return Response(json.dumps(response), 200, mimetype='application/json')
