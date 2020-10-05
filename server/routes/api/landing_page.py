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
import datetime
import json
import urllib

from flask import Blueprint, current_app, request, Response, url_for
from collections import defaultdict

from cache import cache
import services.datacommons as dc_service
import routes.api.place as place_api

import logging

# Define blueprint
bp = Blueprint("api.landing_page", __name__, url_prefix='/api/landingpage')

BAR_CHART_TYPES = ['parent', 'similar', 'nearby', 'child']
MAX_DENOMINATOR_BACK_YEAR = 3
MIN_CHART_TO_KEEP_TOPICS = 30
OVERVIEW = 'Overview'


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


def build_spec(chart_config):
    """Builds hierachical spec based on chart config."""
    spec = defaultdict(lambda: defaultdict(list))
    # Map: category -> topic -> [config]
    for conf in chart_config:
        config = copy.deepcopy(conf)
        is_overview = ('isOverview' in config and config['isOverview'])
        category = config['category']
        if 'isOverview' in config:
            del config['isOverview']
        del config['category']
        if is_overview:
            spec[OVERVIEW][category].append(config)
        spec[category][config['title']].append(config)
    return spec


# TODO(shifucun): Add unittest for these helper functions
def get_bar(cc, data, places):
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


def get_trend(cc, data, place):
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


def get_year(date):
    for fmt in ('%Y', '%Y-%m', '%Y-%m-%d'):
        try:
            return datetime.datetime.strptime(date, fmt).year
        except ValueError:
            pass
    raise ValueError('no valid date format found')


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
            try:
                numerator_year = get_year(date)
                for i in range(0, MAX_DENOMINATOR_BACK_YEAR + 1):
                    year = str(numerator_year - i)
                    if year in denominator:
                        if denominator[year] > 0:
                            data[date] = value / denominator[year]
                        else:
                            data[date] = 0
                        break
            except ValueError:
                return {}

    return data


@bp.route('/data/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def data(dcid):
    """
    Get chart spec and stats data of the landing page for a given place.
    """
    spec_and_stat = build_spec(current_app.config['CHART_CONFIG'])
    raw_page_data = get_landing_page_data(dcid)

    # Only US places have comparison charts.
    is_usa_place = False
    for place in [dcid] + raw_page_data.get('parentPlaces', []):
        if place == 'country/USA':
            is_usa_place = True
            break

    # Populate the data for each chart
    all_stat = raw_page_data['data']
    for category in spec_and_stat:
        if not is_usa_place:
            chart_types = []
        elif category == 'Overview':
            chart_types = ['nearby', 'child']
        else:
            chart_types = BAR_CHART_TYPES
        for topic in spec_and_stat[category]:
            for chart in spec_and_stat[category][topic]:
                # Trend data
                chart['trend'] = get_trend(chart, all_stat, dcid)
                # Bar data
                for t in chart_types:
                    chart[t] = get_bar(chart, all_stat, [dcid] +
                                       raw_page_data.get(t + 'Places', []))
    # Remove empty category and topics
    for category in list(spec_and_stat.keys()):
        for topic in list(spec_and_stat[category].keys()):
            filtered_charts = []
            for chart in spec_and_stat[category][topic]:
                keep_chart = False
                for t in ['trend'] + BAR_CHART_TYPES:
                    if chart.get(t, None):
                        keep_chart = True
                        break
                if keep_chart:
                    filtered_charts.append(chart)
            if not filtered_charts:
                del spec_and_stat[category][topic]
            else:
                spec_and_stat[category][topic] = filtered_charts
        if not spec_and_stat[category]:
            del spec_and_stat[category]
    # For non US places, only keep the "Overview" category if the number of
    # total chart is less than certain threshold.
    if not is_usa_place:
        overview_set = set()
        non_overview_set = set()
        chart_count = 0
        # Get the overview charts
        for topic, charts in spec_and_stat['Overview'].items():
            for chart in charts:
                overview_set.add((topic, chart['title']))
                chart_count += 1
        # Get the non overview charts
        for category, topic_data in spec_and_stat.items():
            if category == 'Overview':
                continue
            for topic in topic_data:
                if (category, topic) not in overview_set:
                    non_overview_set.add((category, topic))
                    chart_count += 1
        # If the total number of chart is too small, then merge all charts to
        # the overview category and remove other categories
        if chart_count < MIN_CHART_TO_KEEP_TOPICS:
            for category, topic in non_overview_set:
                spec_and_stat['Overview'][category].append(
                    spec_and_stat[category][topic])
            for category in list(spec_and_stat.keys()):
                if category != 'Overview':
                    del spec_and_stat[category]

    # Get display name for all places
    all_places = [dcid]
    for t in BAR_CHART_TYPES:
        all_places.extend(raw_page_data.get(t + 'Places', []))
    names = place_api.get_display_name('^'.join(sorted(all_places)))

    response = {
        'pageChart': spec_and_stat,
        'allChildPlaces': raw_page_data.get('allChildPlaces', {}),
        'childPlaces': raw_page_data.get('childPlaces', []),
        'parentPlaces': raw_page_data.get('parentPlaces', []),
        'similarPlaces': raw_page_data.get('similarPlaces', []),
        'nearbyPlaces': raw_page_data.get('nearbyPlaces', []),
        'names': names,
    }
    return Response(json.dumps(response), 200, mimetype='application/json')
