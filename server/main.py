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

"""Main entry module specified in app.yaml.

This module contains the request handler codes and the main app.
"""

import collections
import datetime
import json
import logging
import os

import flask
from flask import request, redirect, url_for
from flask_caching import Cache
from google.cloud import storage
import jinja2

import services.datacommons as dc
from models import datachart_handler
from models import barchart_handler
from lib import line_chart
from lib import translator
from lib.gcs import list_blobs
import lib.barchart_template as btemp

from __init__ import create_app
from cache import cache

_MAX_BLOBS = 1

# Max search results
_MAX_SEARCH_RESULTS = 1000

_SA_FEED_BUCKET = 'datacommons-frog-feed'

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s %(lineno)d : %(message)s')


app = create_app()

GCS_BUCKET = app.config['GCS_BUCKET']

@app.context_processor
def utility_processor():
    return dict(datetime=datetime)


def get_place_args(get_values):
    place_args = collections.OrderedDict()
    all_idx = [''] + [str(i)
                      for i in range(1, datachart_handler.MAX_POPOBS_TYPES + 1)]
    all_dcids = set()
    for idx in all_idx:
        dcids = get_values.getlist('mid{}'.format(idx))
        if dcids:
            place_args[idx] = (
                dcids, datachart_handler.parse_pop_obs_args(get_values, idx))
            all_dcids |= set(dcids)
    return place_args, all_dcids


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_property_value(dcid, prop, out=True):
    return dc.get_property_values([dcid], prop, out)[dcid]


@app.route('/')
@app.route('/browser')
def homepage():
    return flask.render_template('homepage.html')


@app.route('/dev')
def dev():
    if os.environ.get('FLASK_ENV') == 'production':
        flask.abort(404)
    return flask.render_template('dev.html')


@app.route('/scatter')
def gni():
    return flask.render_template('gni_scatter.html')


@app.route('/gni')
def scatter():
    return flask.render_template('gni_explore.html')


@app.route('/download')
def download():
    return flask.render_template('gni_download.html')


@app.route('/download2')
def download_bulk():
    return flask.render_template('gni_download_bulk.html')


@app.route('/kg')
def entity_page():
    dcid = request.args.get('dcid')
    return flask.render_template('kg.html', dcid=dcid)


# TODO(boxu): Complete this routing when place sub-topic page is completed.
@app.route('/explore/place')
def explore_place():
    place_dcid = request.args.get('dcid')
    return redirect(url_for('place', dcid=place_dcid))


@app.route('/place')
def place():
    place_dcid = request.args.get('dcid')
    if not place_dcid:
        return redirect(url_for('place', dcid='geoId/0649670'))
    place_types = get_property_value(place_dcid, 'typeOf')
    # We prefer to use specific type like "State", "County" over "AdministrativeArea"
    chosen_type = None
    for place_type in place_types:
        if not chosen_type or chosen_type.startswith('AdministrativeArea'):
            chosen_type = place_type
    place_name = get_property_value(place_dcid, 'name')[0]
    return flask.render_template(
        'place_overview.html', place_type=chosen_type, place_name=place_name)


@cache.cached(timeout=3600 * 24)
@app.route('/api/placeid2dcid/<path:placeid>')
def api_placeid2dcid(placeid):
    """
    API endpoint to get dcid based on place id.

    This is to use together with the Google Maps Autocomplete API:
    https://developers.google.com/places/web-service/autocomplete.
    """
    mapping = get_placeid2dcid()
    if placeid in mapping:
        return mapping[placeid]
    else:
        flask.abort('dcid not found for %s' % placeid, 404)


# Getting the blob at module level will make the server crash when deploying
# to AppEngine. Make it in a function and cache for 30 days will effectively
# achieve the same caching effect.
@cache.memoize(timeout=3600 * 24 * 30)  # Cache for 30 days.
def get_placeid2dcid():
    # Instantiates a client
    storage_client = storage.Client()
    bucket = storage_client.get_bucket(GCS_BUCKET)
    blob = bucket.get_blob('placeid2dcid.json')
    return json.loads(blob.download_as_string())


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/mapinfo/<path:dcid>')
def api_mapinfo(dcid):
    """
    TODO(wsws/boxu): This function only works for the US, which doesn't have
    the issue of crossing +-180 longitude and +-90 latitude. If using this
    function for places with those complicated situations, need to adjust this
    function accordingly.
    """
    left = 180
    right = -180
    up = -90
    down = 90
    coordinate_sequence_set = []
    kmlCoordinates = get_property_value(dcid, 'kmlCoordinates')
    if not kmlCoordinates:
        return {}

    coordinate_groups = kmlCoordinates[0].split('</coordinates><coordinates>')
    for coordinate_group in coordinate_groups:
        coordinates = coordinate_group.replace(
            '<coordinates>', '').replace('</coordinates>', '').split(' ')
        coordinate_sequence = []
        for coordinate in coordinates:
            v = coordinate.split(',')
            x = float(v[0])
            y = float(v[1])
            left = min(left, x)
            right = max(right, x)
            down = min(down, y)
            up = max(up, y)
            coordinate_sequence.append({'lat': y, 'lng': x})
        coordinate_sequence_set.append(coordinate_sequence)

    x_spread = right - left
    y_spread = up - down
    margin = 0.02

    return {
        'left': left - margin * x_spread,
        'right': right + margin * x_spread,
        'up': up + margin * y_spread,
        'down': down - margin * y_spread,
        'coordinateSequenceSet': coordinate_sequence_set
    }


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_related_place(
        dcid, population_type, measured_property, stat_type, pvs_string='',
        measurement_method=None, same_place_type=None, within_place=None,
        is_per_capita=None):
    pv_tokens = pvs_string.split('^')
    pvs = {}
    for i in range(len(pv_tokens) // 2):
        pvs[pv_tokens[i*2]] = pv_tokens[i*2+1]
    return dc.get_related_place(
        [dcid], population_type, measured_property, stat_type, pvs=pvs,
        measurement_method=measurement_method, same_place_type=same_place_type,
        within_place=within_place, is_per_capita=is_per_capita).get(dcid, {})


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def api_similar_places_helper(dcid, stats_var):
    triples = dc.get_triples([stats_var])[stats_var]
    population_type = None
    measured_property = None
    stat_type = None
    measurement_method = None
    pvs = {}
    for t in triples:
        if t[1] in ["provenance", "typeOf"]:
            continue
        if t[1] == "statType":
            stat_type = t[2]
        elif t[1] == "populationType":
            population_type = t[2]
        elif t[1] == "measurementMethod":
            measurement_method = t[2]
        elif t[1] == "measuredProperty":
            measured_property = t[2]
        else:
            pvs[t[1]] = t[2]
    return dc.get_related_place(
        [dcid], population_type, measured_property, stat_type, pvs=pvs,
        measurement_method=measurement_method, same_place_type=True).get(dcid, {})


@app.route('/api/similar-place/<path:dcid>')
def api_similar_places(dcid):
    """
    Get the similar places for a given place by stats var.
    """
    stats_var = request.args.get('stats-var')
    if not stats_var:
        flask.abort('Missing url parameter "stats-var"', 400)
    return api_similar_places_helper(dcid, stats_var)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/interesting-place/<path:dcid>')
def api_interesting_places(dcid):
    """
    Get the intersting places for a given place.
    """
    return dc.get_interesting_places([dcid])


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/nearby-place/<path:dcid>')
def api_nearby_places(dcid):
    """
    Get the nearby places for a given place.
    """
    req_json = {'dcids': [dcid],
                'property': 'nearbyPlaces', 'direction': 'out'}
    url = dc.API_ROOT + dc.API_ENDPOINTS['get_property_values']
    payload = dc.send_request(url, req_json=req_json)
    prop_values = payload[dcid].get('out')
    if not prop_values:
        return json.dumps([])
    places = []
    for prop_value in prop_values:
        places.append(prop_value['value'].split('@'))
    places.sort(key=lambda x: x[1])
    dcids = [place[0] for place in places]
    data = dc.get_property_values(dcids, 'typeOf', True)
    return json.dumps(data)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/ranking/<path:dcid>')
def api_ranking(dcid):
    """
    Get the ranking information for a given place.
    """
    parents = json.loads(api_parent_place(dcid))
    selected_parents = []
    parent_names = {}
    for parent in parents:
        parent_dcid = parent['dcid']
        if parent_dcid == 'country/USA':
            continue
        if parent_dcid.startswith('zip'):
            continue
        selected_parents.append(parent_dcid)
        parent_names[parent_dcid] = parent['name']
        if len(selected_parents) == 2:
            break
    selected_parents.append('country/USA')
    parent_names['country/USA'] = 'United States'
    result = collections.defaultdict(list)
    # TODO(boxu): make the stats_vars in a config.
    for parent in selected_parents:
        # Population ranking
        result['Population'].append({
            'name': parent_names[parent],
            'data': get_related_place(
                dcid, 'Person', 'count', 'measuredValue',
                measurement_method='CensusACS5yrSurvey',
                same_place_type=True, within_place=parent)})
        # Median income
        result['Median Income'].append({
            'name': parent_names[parent],
            'data': get_related_place(
                dcid, 'Person', 'income', 'medianValue',
                pvs_string='age^Years15Onwards^incomeStatus^WithIncome',
                measurement_method='CensusACS5yrSurvey',
                same_place_type=True, within_place=parent)})
        # Median age
        result['Median Age'].append({
            'name': parent_names[parent],
            'data': get_related_place(
                dcid, 'Person', 'age', 'medianValue',
                measurement_method='CensusACS5yrSurvey',
                same_place_type=True, within_place=parent)})
        # Unemployment rate
        result['Unemployment Rate'].append({
            'name': parent_names[parent],
            'data': get_related_place(
                dcid, 'Person', 'unemploymentRate', 'measuredValue',
                measurement_method='BLSSeasonallyUnadjusted',
                same_place_type=True, within_place=parent)})
        # Crime
        result['Crime per capita'].append({
            'name': parent_names[parent],
            'data': get_related_place(
                dcid, 'CriminalActivities', 'count', 'measuredValue',
                pvs_string='crimeType^UCR_CombinedCrime',
                same_place_type=True, within_place=parent, is_per_capita=True)})
    result['label'] = [
        'Population', 'Median Income', 'Median Age', 'Unemployment Rate',
        'Crime per capita']
    for label in result['label']:
        no_data = True
        for item in result[label]:
            if item['data']:
                no_data = False
                break
        if no_data:
            del result[label]
    result['label'] = [x for x in result['label'] if x in result]
    return result


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/parent-place/<path:dcid>')
def api_parent_place(dcid):
    """
    Get the child places for a place.
    """
    # In DataCommons knowledge graph, places has multiple containedInPlace
    # relation with parent places, but it might not be comprehensive. For
    # example, "Moutain View" is containedInPlace for "Santa Clara County" and
    # "California" but not "United States": https://browser.datacommons.org/kg?dcid=geoId/0649670
    # Here calling get_parent_place twice to get to the top parents.
    parents1 = get_parent_place(dcid)
    parents2 = get_parent_place(parents1[-1]['dcid'])
    return json.dumps(parents1 + parents2)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_parent_place(dcid):
    req_json = {'dcids': [dcid],
                'property': 'containedInPlace', 'direction': 'out'}
    url = dc.API_ROOT + dc.API_ENDPOINTS['get_property_values']
    payload = dc.send_request(url, req_json=req_json)
    parents = payload[dcid].get('out', [])
    parents.sort(key=lambda x: x['dcid'], reverse=True)
    for i in range(len(parents)):
        if len(parents[i]['types']) > 1:
            parents[i]['types'] = list(
                filter(lambda x: not x.startswith('AdministrativeArea'), parents[i]['types']))
    return parents


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
@app.route('/api/child-place/<path:dcid>')
def api_child_place(dcid):
    """
    Get the child places for a place.
    """
    child_places = get_property_value(dcid, 'containedInPlace', out=False)
    return json.dumps(child_places)


@app.route('/data/line')
def linedata():
    """Handler to get the line data."""
    get_values = request.args
    pc = get_values.get('pc') is not None  # Per Capita
    gr = get_values.get('gr') is not None  # Growth Rate
    place_args, _ = get_place_args(get_values)
    plot_data, _ = datachart_handler.get_plot_data(place_args, pc, gr)
    return json.dumps(plot_data)


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_stats_wrapper(dcid_str, stats_var):
    dcids = dcid_str.split('^')
    return json.dumps(dc.get_stats(dcids, stats_var))


@app.route('/stats/<path:stats_var>')
def stats(stats_var):
    """Handler to get the observation given stats var."""
    place_dcids = request.args.getlist('dcid')
    return get_stats_wrapper('^'.join(place_dcids), stats_var)


@app.route('/datachart/line')
def linechart():
    """Handler for /datachart/line."""
    # TODO(boxu): make ChartHandler a smaller object that only handles args.
    lh = datachart_handler.ChartHandler(request.args)
    get_params = request.args
    rich_legend = get_params.get('richlg') is not None
    place_legend = get_params.get('placelg') is not None
    pc = get_params.get('pc') is not None  # Per Capita
    gr = get_params.get('gr') is not None  # Growth Rate
    chart_dom_id = get_params.get('cdomid', '')
    place_args, all_dcids = get_place_args(get_params)

    single_place = len(all_dcids) == 1

    # A dictionary to color.
    color_map = {}

    # A dictionary to get line style for places.
    style_map = {}

    # A list of legend objects to add.
    legends = []

    # Get observation data.
    plot_data, place_name = datachart_handler.get_plot_data(place_args, pc, gr)

    # See https://docs.google.com/document/d/1dW9izgDzllbhrIJm-aZxWlapMIueVX6WQlImiiDIAFs/edit?usp=sharing
    # for details

    dcid_legend = set()
    for idx, (dcids, args) in place_args.items():
        if len(place_args) == 1:  # Single PV
            for dcid in dcids:
                if dcid not in color_map:
                    color_map[dcid] = datachart_handler.get_color(
                        len(color_map))
                text = args['legend']
                if rich_legend:
                    text = place_name[dcid] + ' ' + text
                if text:
                    legends.append(
                        line_chart.Legend(color=color_map[dcid], text=text, style=''))
        else:  # Multiple PV
            if idx not in color_map:
                color_map[idx] = datachart_handler.get_color(len(color_map))
            color = color_map[idx]
            for dcid in dcids:
                if single_place:
                    text = args['legend']
                    if rich_legend:
                        text = place_name[dcid] + ' ' + text
                    if text:
                        legends.append(
                            line_chart.Legend(color=color, text=text, style=''))
                else:
                    if dcid not in style_map:
                        style_map[dcid] = datachart_handler.get_dash(
                            len(style_map))
                    style = style_map[dcid]
                    if place_legend:
                        if dcid not in dcid_legend:
                            legends.append(
                                line_chart.Legend(
                                    color='grey', text=place_name[dcid], style=style))
                            dcid_legend.add(dcid)
                    else:
                        text = place_name[dcid] + ' ' + args['legend']
                        legends.append(
                            line_chart.Legend(color=color, text=text, style=style))
    lines = []
    for pd in plot_data:
        if len(place_args) == 1:
            color = color_map[pd['dcid']]
            style = ''
        else:
            color = color_map[pd['idx']]
            if single_place:
                style = ''
            else:
                style = style_map[pd['dcid']]
        lines.append(
            line_chart.Line(
                points=pd['points'],
                style=style,
                color=color,
                dom_id=pd['domid']))

    svg = line_chart.build_svg(lines, legends, lh.width, lh.height,
                               lh.title, lh.subtitle, gr,
                               chart_dom_id)
    resp = flask.Response(svg)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Content-Type'] = 'image/svg+xml; charset=utf-8'
    resp.headers['Vary'] = 'Accept-Encoding'
    return resp


@app.route('/datachart/bar')
def barchart():
    """Handler for /datachart/bar."""
    # TODO(boxu): make ChartHandler a smaller object that only handles args.
    bch = barchart_handler.BarChartHandler(request.args)
    data = bch.get_data()
    env = jinja2.Environment()
    template = env.from_string(source=btemp.t)
    resp = flask.Response(template.render(data))
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Content-Type'] = 'image/svg+xml; charset=utf-8'
    resp.headers['Vary'] = 'Accept-Encoding'
    return resp


@app.route('/translator')
def translator_handler():
    return flask.render_template(
        'translator.html',
        schema_mapping=translator.SCHEMA_MAPPING,
        sample_query=translator.SAMPLE_QUERY)


@app.route('/search')
def search():
    query_text = request.args.get('query', '')
    max_results = int(request.args.get('l', _MAX_SEARCH_RESULTS))
    search_response = dc.search(query_text, max_results)

    # Convert from search results to template dictionary.
    results = []
    query_tokens = set(query_text.lower().split())
    for section in search_response.get('section', []):
        entities = []
        for search_entity in section['entity']:
            entity = {}
            entity['name'] = search_entity['name']
            entity['dcid'] = search_entity['dcid']
            name_tokens = search_entity['name'].lower().split()
            for i, t in enumerate(name_tokens):
                name_tokens[i] = t.strip("'")
            name_tokens = set(name_tokens)
            if not name_tokens & query_tokens:
                continue
            entity['rank'] = len(name_tokens & query_tokens) / len(name_tokens
                                                                   | query_tokens)
            entities.append(entity)
        entities = sorted(entities, key=lambda e: (e['rank']), reverse=True)
        if entities:
            results.append({
                'type': section['typeName'],
                'entities': entities,
            })
    return flask.render_template('search.html', query_text=query_text, results=results)


@app.route('/weather')
def get_weather():
    dcid = request.args.get('dcid')
    prop = request.args.get('prop')
    if not dcid:
        flask.abort('Missing url parameter "dcid"', 400)
    if not prop:
        flask.abort('Missing url parameter "prop"', 400)

    query_string = ('SELECT ?date ?mean ?unit '
                    'WHERE {{'
                    ' ?o typeOf WeatherObservation .'
                    ' ?o observedNode {dcid} .'
                    ' ?o measuredProperty {prop} .'
                    ' ?o observationDate ?date .'
                    ' ?o unit ?unit .'
                    ' ?o meanValue ?mean .}}').format(
        dcid=dcid, prop=prop)

    _, rows = dc.query(query_string)

    observations = []
    for row in rows:
        date = row['cells'][0]['value']
        if date < '2000':
            continue
        text = 'mean {}: {} {}'.format(prop, row['cells'][1]['value'],
                                       row['cells'][2]['value'])
        observations.append({
            'measuredProperty': prop,
            'observationDate': date,
            'meanValue': row['cells'][1]['value'],
            'unit': row['cells'][2]['value'],
            'text': text,
        })
    return json.dumps(observations)


@app.route('/mcf_playground')
def mcf_playground():
    return flask.render_template('mcf_playground.html')


#
# STATIC PAGES FROM DATACOMMONS.ORG
#

@app.route('/faq')
def faq():
  return flask.render_template('factcheck/faq.html')


@app.route('/documentation')
def documentation():
  return flask.render_template('factcheck/documentation.html')


@app.route('/disclaimers')
def disclaimers():
  return flask.render_template('factcheck/disclaimers.html')


@app.route('/getinvolved')
def get_involved():
  return flask.render_template('factcheck/getInvolved.html')


@app.route('/colab')
def colab():
  return flask.render_template('factcheck/colab.html')


@app.route('/data')
def data():
  return flask.render_template('factcheck/data.html')


@app.route('/datasets')
def datasets():
  return flask.render_template('factcheck/datasets.html')


@app.route('/special_announcement')
def special_announcement_homepage():
  recent_blobs = list_blobs(_SA_FEED_BUCKET, _MAX_BLOBS)
  return flask.render_template(
      'factcheck/special_announcement.html', recent_blobs=recent_blobs)


@app.route('/special_announcement/faq')
def special_announcement_faq():
  return flask.render_template(
      'factcheck/special_announcement_faq.html')


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)

# [END gae_python37_app]
