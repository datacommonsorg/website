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
"""Defines endpoints for the landing page.

TODO(shifucun): once this is well tested, can deprecate corresponding code
in chart.py and place.py
"""

import collections
import copy
import json
import urllib

from flask import Blueprint, current_app, request, Response, url_for

from cache import cache
import services.datacommons as dc_service
import routes.api.place as place_api

import logging

# Define blueprint
bp = Blueprint("api.landing_page", __name__, url_prefix='/api/landingpage')


def get_landing_page_data(dcid):
    response = dc_service.fetch_data('/landing-page', {
        'place': dcid,
    },
                                     compress=False,
                                     post=True,
                                     has_payload=True)
    return response


def build_url(dcids, stats_vars):
    anchor = '&place={}&statsVar={}'.format(','.join(dcids),
                                            '__'.join(stats_vars))
    return urllib.parse.unquote(url_for('tools.timeline', _anchor=anchor))


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


# TODO(shifucun): Add unittest for these helper functions
def get_bar_data(cc, data, places):
    """Get the bar data across a few places.

    This will scale the value if required and pick the latest date that has the
    most <place, stat_var> entries.
    """
    if not places:
        return {}

    if 'denominator' in cc:
        if len(cc['denominator']) < len(cc['statsVars']):
            logging.error('Missing denominator in %s', cc)
            return {}

    # date_to_data is a dictionary from date to place and a tuple of
    # (stat_var, value) pair.
    # Example:
    # {
    #     "2018": {
    #         "geoId/06":[("Count_Person", 200), ("Count_Person_Female", 100)],
    #         "geoId/08":[("Count_Person", 300), ("Count_Person_Female", 150)],
    #     },
    #     "2017": {
    #         "geoId/06":[("Count_Person", 300), ("Count_Person_Female", 150)],
    #         "geoId/08":[("Count_Person", 400), ("Count_Person_Female", 200)],
    #     },
    # }
    date_to_data = collections.defaultdict(
        lambda: collections.defaultdict(list))

    # TODO(shifucun/beets): add a unittest to ensure denominator is set
    # explicitly when scale==True
    denominator_stat_var = None
    if 'relatedChart' in cc and cc['relatedChart'].get('scale', False):
        denominator_stat_var = cc['relatedChart'].get('denominator',
                                                      'Count_Person')

    sources = set()
    for dcid in places:
        if dcid not in data:
            continue
        for i, stat_var in enumerate(cc['statsVars']):
            series_raw = data[dcid].get(stat_var, {})
            if not series_raw:
                continue
            if 'denominator' in cc:
                denominator_stat_var = cc['denominator'][i]
            if denominator_stat_var is not None:
                denominator_raw = data[dcid].get(denominator_stat_var, {})
                if not denominator_raw:
                    continue
                series = scale_series(series_raw['data'],
                                      denominator_raw['data'])
                sources.add(series_raw['provenanceDomain'])
                sources.add(denominator_raw['provenanceDomain'])
            else:
                series = series_raw['data']
                sources.add(series_raw['provenanceDomain'])
            # Turn the value to be keyed by date.
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
    result = {'date': chosen_date, 'data': [], 'sources': list(sources)}
    for place in places:
        points = {}
        for stat_var, value in date_to_data[chosen_date][place]:
            points[stat_var] = value
        if points:
            result['data'].append({'dcid': place, 'data': points})
    # Should have data other than the primary place. Return empty struct to
    # so client won't draw chart.
    if len(result['data']) <= 1:
        return {}
    result['exploreUrl'] = build_url(places, cc['statsVars'])
    return result


def get_trend_data(cc, data, place):
    """Get the time series data for a place."""
    if place not in data:
        return {}

    if 'denominator' in cc:
        if len(cc['denominator']) < len(cc['statsVars']):
            logging.error('Missing denominator in %s', cc)
            return {}

    series = {}
    sources = set()
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
            # TODO(shifucun): ensure the source is added only when the data
            # is included.
            sources.add(numerator_raw['provenanceDomain'])
            sources.add(denominator_raw['provenanceDomain'])
        else:
            series[stat_var] = numerator_raw['data']
            sources.add(numerator_raw['provenanceDomain'])
    if not series:
        return {}
    return {
        'series': series,
        'sources': list(sources),
        'exploreUrl': build_url([place], cc['statsVars'])
    }


# TODO(shifucun): Add unittest.
def scale_series(numerator, denominator):
    """Scale two time series.

    The date of the two time series may not be exactly aligned. Here we use
    year alignment to match two date. If no denominator is found for a
    numerator, then the data is removed.
    """
    data = {}
    for date, value in numerator.items():
        if date in denominator:
            if denominator[date] > 0:
                data[date] = value / denominator[date]
            else:
                data[date] = 0
        else:
            # TODO(shifucun): Use https://docs.python.org/3.7/library/datetime.html#datetime.datetime.strptime
            parts = date.split('-')
            year = parts[0]
            if len(parts) > 1 and year in denominator:
                if denominator[year] > 0:
                    data[date] = value / denominator[year]
                else:
                    data[date] = 0
    return data


@bp.route('/data/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def data(dcid):
    """
    Get chart config and stats data of the landing page for a given place.
    """
    raw_config = current_app.config['CHART_CONFIG']
    config_data = build_config(raw_config)
    cache_data = get_landing_page_data(dcid)

    for category in config_data:
        filtered_charts = []
        for chart in category['charts']:
            # Populate the overview page data.
            # TODO(shifucun/beets): simplify the logic in here.
            # Trend data
            chart['trend'] = get_trend_data(chart, cache_data['data'], dcid)
            # Parent places data
            chart['parent'] = get_bar_data(chart, cache_data['data'], [dcid] +
                                           cache_data.get('parentPlaces', []))
            # Similar places data
            chart['similar'] = get_bar_data(chart, cache_data['data'], [dcid] +
                                            cache_data.get('similarPlaces', []))
            # Nearby places data
            chart['nearby'] = get_bar_data(chart, cache_data['data'], [dcid] +
                                           cache_data.get('nearbyPlaces', []))
            # Nearby places data
            chart['child'] = get_bar_data(chart, cache_data['data'], [dcid] +
                                          cache_data.get('childPlaces', []))
            if (chart['trend'] or chart['parent'] or chart['similar'] or
                    chart['nearby'] or chart['child']):
                filtered_charts.append(chart)
        category['charts'] = filtered_charts

        # Populate topic page data.
        filtered_topic = []
        for child in category['children']:
            potential_child_charts = []
            for chart in child['charts']:
                # Trend data
                chart['trend'] = get_trend_data(chart, cache_data['data'], dcid)
                # Parent places data
                chart['parent'] = get_bar_data(
                    chart, cache_data['data'],
                    [dcid] + cache_data.get('parentPlaces', []))
                # Similar places data
                chart['similar'] = get_bar_data(
                    chart, cache_data['data'],
                    [dcid] + cache_data.get('similarPlaces', []))
                # Nearby places data
                chart['nearby'] = get_bar_data(
                    chart, cache_data['data'],
                    [dcid] + cache_data.get('nearbyPlaces', []))
                # Child places data
                chart['child'] = get_bar_data(chart, cache_data['data'],
                                              [dcid] +
                                              cache_data.get('childPlaces', []))
                if (chart['trend'] or chart['parent'] or chart['similar'] or
                        chart['nearby'] or chart['child']):
                    potential_child_charts.append(chart)
            if potential_child_charts:
                child['charts'] = potential_child_charts
                filtered_topic.append(child)
        if filtered_topic:
            category['children'] = filtered_topic

    allPlaces = [dcid]
    for relation in [
            'parentPlaces', 'similarPlaces', 'nearbyPlaces', 'childPlaces'
    ]:
        allPlaces.extend(cache_data.get(relation, []))

    names = place_api.get_display_name('^'.join(sorted(allPlaces)))

    response = {
        'configData': config_data,
        'allChildPlaces': cache_data.get('allChildPlaces', {}),
        'childPlaces': cache_data.get('childPlaces', []),
        'parentPlaces': cache_data.get('parentPlaces', []),
        'similarPlaces': cache_data.get('similarPlaces', []),
        'nearbyPlaces': cache_data.get('nearbyPlaces', []),
        'names': names,
    }
    return Response(json.dumps(response), 200, mimetype='application/json')
