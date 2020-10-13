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
import lib.range as lib_range

# Define blueprint
bp = Blueprint("api.landing_page", __name__, url_prefix='/api/landingpage')

BAR_CHART_TYPES = ['parent', 'similar', 'nearby', 'child']
MAX_DENOMINATOR_BACK_YEAR = 3
MIN_CHART_TO_KEEP_TOPICS = 30
OVERVIEW = 'Overview'


def get_landing_page_data(dcid, stat_vars):
    response = dc_service.fetch_data('/landing-page', {
        'place': dcid,
        'statVars': stat_vars,
    },
                                     compress=False,
                                     post=True,
                                     has_payload=True)
    return response


def build_url(dcids, stats_vars, is_scaled=False):
    anchor = '&place={}&statsVar={}'.format(','.join(dcids),
                                            '__'.join(stats_vars))
    if is_scaled:
        anchor = anchor + '&pc=1'
    return urllib.parse.unquote(url_for('tools.timeline', _anchor=anchor))


# TODO: add test for chart_config for assumption that each combination of stat vars will only have one config in chart_config.
def build_spec(chart_config):
    """Builds hierachical spec based on chart config."""
    spec = defaultdict(lambda: defaultdict(list))
    stat_vars = []
    # Map: category -> topic -> [config]
    for conf in chart_config:
        config = copy.deepcopy(conf)
        is_overview = ('isOverview' in config and config['isOverview'])
        category = config['category']
        if 'isOverview' in config:
            del config['isOverview']
        del config['category']
        if is_overview:
            spec[OVERVIEW][category].append(copy.deepcopy(config))
        spec[category][config['title']].append(config)
        stat_vars.extend(config['statsVars'])
        stat_vars.extend(config.get('denominator', []))
    return spec, stat_vars


def get_denom(cc, related_chart=False):
    """Get the numerator and denominator map."""
    # If chart requires denominator, use itfor both primary and related charts.
    if 'denominator' in cc:
        result = {}
        if len(cc['denominator']) != len(cc['statsVars']):
            raise ValueError('Denominator number not matching: %s', cc)
        for num, denom in zip(cc['statsVars'], cc['denominator']):
            result[num] = denom
        return result
    # For related chart, use the denominator that is specified in the
    # 'relatedChart' field if present.
    if related_chart and cc.get('relatedChart', {}).get('scale', False):
        return cc['relatedChart'].get('denominator', 'Count_Person')
    return None


def get_series(data, place, stat_vars):
    """Get time series from the landing page data.

    Aggregate for all the stat vars and return empty series if any stat var data
    is missing

    Returns:
        series and sources.
    """
    all_series = []
    sources = set()
    num_sv = len(stat_vars)
    for sv in stat_vars:
        if not data[place].get(sv, {}):
            return {}, []
        series = data[place][sv]
        all_series.append(series['data'])
        sources.add(series['provenanceDomain'])
    # One series, no need to aggregate
    if num_sv == 1:
        return all_series[0], sources
    merged_series = defaultdict(list)
    for series in all_series:
        for date, value in series.items():
            merged_series[date].append(value)
    # Aggregate
    agg_series = {}
    for date, values in merged_series.items():
        if len(values) == num_sv:
            agg_series[date] = sum(values)
    return agg_series, sources


def get_stat_var_group(cc, data, places):
    """Get the stat var grouping for aggregation."""
    if 'aggregate' in cc:
        agg_type = lib_range.get_aggregate_config(cc['aggregate'])
        place_stat_vars = defaultdict(list)
        for place in places:
            if place not in data:
                continue
            for sv in cc['statsVars']:
                if data[place][sv]:
                    place_stat_vars[place].append(sv)
        result = lib_range.aggregate_stat_var(place_stat_vars, agg_type)
        for place in places:
            if place not in result:
                result[place] = {}
    else:
        result = {}
        for place in places:
            result[place] = {sv: [sv] for sv in cc['statsVars']}
    return result


def get_snapshot_across_places(cc, data, places):
    """Get the snapshot used for bar data across a few places.

    This will scale the value if required and pick the latest date that has the
    most <place, stat_var> entries.
    """
    if not places:
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
    num_denom = get_denom(cc, related_chart=True)
    sources = set()
    place_stat_var_group = get_stat_var_group(cc, data, places)
    for place in places:
        if place not in data:
            continue
        stat_var_group = place_stat_var_group[place]
        for num_sv, sv_list in stat_var_group.items():
            num_series, num_sources = get_series(data, place, sv_list)
            if not num_series:
                continue
            sources.update(num_sources)
            if num_denom:
                if isinstance(num_denom, dict):
                    denom_sv = num_denom[num_sv]
                else:
                    denom_sv = num_denom
                denom_series, denom_sources = get_series(
                    data, place, [denom_sv])
                if not denom_series:
                    continue
                sources.update(denom_sources)
                result_series = scale_series(num_series, denom_series)
            else:
                result_series = num_series
            # Turn the value to be keyed by date.
            for date, value in result_series.items():
                date_to_data[date][place].append((num_sv, value))
    # Pick a date that has the most series across places.
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
    return result


# TODO(shifucun): Add unittest for these helper functions
def get_bar(cc, data, places):
    """Get the bar data across a few places.

    This will scale the value if required and pick the latest date that has the
    most <place, stat_var> entries.
    """
    result = get_snapshot_across_places(cc, data, places)
    if not result:
        return {}
    # Should have data other than the primary place. Return empty struct to
    # so client won't draw chart.
    if len(result['data']) <= 1:
        return {}
    is_scaled = (('relatedChart' in cc and
                  cc['relatedChart'].get('scale', False)) or
                 ('denominator' in cc))
    result['exploreUrl'] = build_url(places, cc['statsVars'], is_scaled)
    return result


def get_trend(cc, data, place):
    """Get the time series data for a place."""
    if place not in data:
        return {}

    result_series = {}
    sources = set()
    num_denom = get_denom(cc)
    stat_var_group = get_stat_var_group(cc, data, [place])[place]
    for num_sv, sv_list in stat_var_group.items():
        num_series, num_sources = get_series(data, place, sv_list)
        if not num_series:
            continue
        sources.update(num_sources)
        if num_denom:
            if isinstance(num_denom, dict):
                denom_sv = num_denom[num_sv]
            else:
                denom_sv = num_denom
            denom_sv = num_denom[num_sv]
            denom_series, denom_sources = get_series(data, place, [denom_sv])
            if not denom_series:
                continue
            sources.update(denom_sources)
            result_series[num_sv] = scale_series(num_series, denom_series)
        else:
            result_series[num_sv] = num_series
    # filter out time series with single data point.
    for sv in list(result_series.keys()):
        if len(result_series[sv]) <= 1:
            del result_series[sv]
    if not result_series:
        return {}

    is_scaled = ('denominator' in cc)
    return {
        'series': result_series,
        'sources': list(sources),
        'exploreUrl': build_url([place], cc['statsVars'], is_scaled)
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
    spec_and_stat, stat_vars = build_spec(current_app.config['CHART_CONFIG'])
    raw_page_data = get_landing_page_data(dcid, stat_vars)

    # Only US places have comparison charts.
    is_usa_place = False
    for place in [dcid] + raw_page_data.get('parentPlaces', []):
        if place == 'country/USA':
            is_usa_place = True
            break
    # Populate the data for each chart
    all_stat = raw_page_data['data']
    for category in spec_and_stat:
        if category == OVERVIEW:
            if is_usa_place:
                chart_types = ['nearby', 'child']
            else:
                chart_types = ['similar']
        else:
            chart_types = BAR_CHART_TYPES
        for topic in spec_and_stat[category]:
            for chart in spec_and_stat[category][topic]:
                # Trend data
                chart['trend'] = get_trend(chart, all_stat, dcid)
                if 'aggregate' in chart:
                    aggregated_stat_vars = list(chart['trend'].get(
                        'series', {}).keys())
                    if aggregated_stat_vars:
                        chart['trend']['statsVars'] = aggregated_stat_vars
                    else:
                        chart['trend'] = {}
                # Bar data
                for t in chart_types:
                    chart[t] = get_bar(chart, all_stat, [dcid] +
                                       raw_page_data.get(t + 'Places', []))
                    if t == 'similar' and 'data' in chart[t]:
                        # If no data for current place, do not serve similar
                        # place data.
                        keep_chart = False
                        for d in chart[t]['data']:
                            if d['dcid'] == dcid:
                                keep_chart = True
                                break
                        if not keep_chart:
                            chart[t] = {}
                    # Update stat vars for aggregated stats
                    if 'aggregate' in chart and chart[t]:
                        chart[t]['statsVars'] = []
                        for place_data in chart[t].get('data', []):
                            stat_vars = list(place_data['data'].keys())
                            if len(stat_vars) > len(chart[t]['statsVars']):
                                chart[t]['statsVars'] = stat_vars
                            elif len(stat_vars) == 0:
                                chart[t] = {}
                if 'aggregate' in chart:
                    chart['statsVars'] = []

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
    # Only keep the "Overview" category if the number of total chart is less
    # than certain threshold.
    overview_set = set()
    non_overview_set = set()
    chart_count = 0
    # Get the overview charts
    for topic, charts in spec_and_stat[OVERVIEW].items():
        for chart in charts:
            overview_set.add((topic, chart['title']))
            chart_count += 1
    # Get the non overview charts
    for category, topic_data in spec_and_stat.items():
        if category == OVERVIEW:
            continue
        for topic in topic_data:
            if (category, topic) not in overview_set:
                non_overview_set.add((category, topic))
                chart_count += 1
    # If the total number of chart is too small, then merge all charts to
    # the overview category and remove other categories
    if chart_count < MIN_CHART_TO_KEEP_TOPICS:
        for category, topic in non_overview_set:
            spec_and_stat[OVERVIEW][category].extend(
                spec_and_stat[category][topic])
        for category in list(spec_and_stat.keys()):
            if category != OVERVIEW:
                del spec_and_stat[category]

    # Get display name for all places
    all_places = [dcid]
    for t in BAR_CHART_TYPES:
        all_places.extend(raw_page_data.get(t + 'Places', []))
    names = place_api.get_display_name('^'.join(sorted(all_places)))

    # Pick data to highlight - only population for now
    highlight = {
        'Population':
            get_snapshot_across_places({'statsVars': ['Count_Person']},
                                       all_stat, [dcid])
    }

    response = {
        'pageChart': spec_and_stat,
        'allChildPlaces': raw_page_data.get('allChildPlaces', {}),
        'childPlacesType': raw_page_data.get('childPlacesType', ""),
        'childPlaces': raw_page_data.get('childPlaces', []),
        'parentPlaces': raw_page_data.get('parentPlaces', []),
        'similarPlaces': raw_page_data.get('similarPlaces', []),
        'nearbyPlaces': raw_page_data.get('nearbyPlaces', []),
        'names': names,
        'highlight': highlight,
    }
    return Response(json.dumps(response), 200, mimetype='application/json')
