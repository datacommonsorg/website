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

import json
import services.datacommons as dc_service
import routes.api.place as place_api
import routes.api.choropleth as choropleth_api
import routes.api.landing_page as landing_page_api

from cache import cache
from flask import Blueprint, current_app, request, Response, g
from routes.api.place import EQUIVALENT_PLACE_TYPES
# Define blueprint
bp = Blueprint("api_chart", __name__, url_prefix='/api/chart')

# Place type to get choropleth for, keyed by place type
# TODO: Come up with a catch all way to determine place type to get choropleth for because
# this works for US places, but hierarchy of places in other countries may be different
CHOROPLETH_DISPLAY_LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "AdministrativeArea2"
}
# GeoJSON property to use, keyed by display level.
CHOROPLETH_GEOJSON_PROPERTY_MAP = {
    "AdministrativeArea1": "geoJsonCoordinatesDP3",
    "AdministrativeArea2": "geoJsonCoordinatesDP2",
}


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_choropleth_places(geoDcid):
    """ Get the list of places to show on a choropleth chart for a given place

    Args:
        geoDcid: dcid of the place of interest

    Returns:
        (list of dcids, property to use for fetching geo json)
    """
    place_list = []
    place_type = place_api.get_place_type(geoDcid)
    display_level = None
    if place_type in CHOROPLETH_DISPLAY_LEVEL_MAP:
        display_level = CHOROPLETH_DISPLAY_LEVEL_MAP[place_type]
    elif place_type in EQUIVALENT_PLACE_TYPES and EQUIVALENT_PLACE_TYPES[
            place_type] in CHOROPLETH_DISPLAY_LEVEL_MAP:
        place_type = EQUIVALENT_PLACE_TYPES[place_type]
        display_level = CHOROPLETH_DISPLAY_LEVEL_MAP[place_type]
    else:
        return place_list

    if place_type == display_level:
        parents_places = place_api.parent_places(geoDcid)
        for parent in parents_places.get(geoDcid, []):
            parent_dcid = parent.get('dcid', None)
            if not parent_dcid:
                continue
            parent_place_types = parent.get('types', [])
            for parent_place_type in parent_place_types:
                parent_display_level = CHOROPLETH_DISPLAY_LEVEL_MAP.get(
                    parent_place_type, None)
                if not parent_display_level:
                    parent_display_level = CHOROPLETH_DISPLAY_LEVEL_MAP.get(
                        EQUIVALENT_PLACE_TYPES.get(parent_place_type, ''))
                if parent_display_level == display_level:
                    place_list = dc_service.get_places_in([parent_dcid],
                                                          display_level).get(
                                                              parent_dcid, [])
                    geo_prop = CHOROPLETH_GEOJSON_PROPERTY_MAP[display_level]
                    # Puerto Rico (geoId/72) requires higher resolution geoJson
                    if parent_dcid == 'geoId/72':
                        geo_prop = 'geoJsonCoordinatesDP1'
                    return place_list, geo_prop
        return place_list
    else:
        place_list = dc_service.get_places_in([geoDcid],
                                              display_level).get(geoDcid, [])
        geo_prop = CHOROPLETH_GEOJSON_PROPERTY_MAP[display_level]
        # Puerto Rico (geoId/72) requires higher resolution geoJson
        if geoDcid == 'geoId/72':
            geo_prop = 'geoJsonCoordinatesDP1'
        return place_list, geo_prop


@bp.route('/geojson/<path:dcid>')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
# TODO(hanlu): pasrse locale once from global context instead.
def geojson(dcid):
    """
    Get geoJson data for a given place
    """
    geos, geojson_prop = get_choropleth_places(dcid)
    if not geos:
        return Response(json.dumps({}), 200, mimetype='application/json')

    names_by_geo = place_api.get_display_name('^'.join(geos), g.locale)
    geojson_by_geo = dc_service.get_property_values(geos, geojson_prop)
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
    """ Gets all the chart configs that have choropleth charts and gets all the stat vars and denominators
    in those chart configs

    Returns:
        a tuple consisting of:
            set of all stat vars including both the stat vars of the charts and stat vars of denominators
            list of chart configs that are choropleth chart configs
    """
    chart_config = current_app.config['CHART_CONFIG']
    all_sv = set()
    chart_configs = []
    for config in chart_config:
        if config.get('isChoropleth', False):
            # we should only be making choropleths for configs with a single stat var
            # TODO(chejennifer) add test for chart config to ensure isChoropleth is only added to charts with single statvar
            sv = config['statsVars'][0]
            all_sv.add(sv)
            if 'relatedChart' in config and config['relatedChart'].get(
                    'scale', False):
                all_sv.add(config['relatedChart'].get('denominator',
                                                      'Count_Person'))
            if 'denominator' in config:
                all_sv.add(config['denominator'][0])
            chart_configs.append(config)
    return all_sv, chart_configs


def process_choropleth_data(all_sv_data):
    """ For each combination of geo dcid and stat var, gets the source series containing
    data from the most recent date

    Args:
        all_sv_data: value of the key 'placeData' in the object received from getStatsAll

    Returns:
        dictionary of dictionary of statvar: data for single source series, keyed by place dcid
    """
    result = {}
    for geo, data_for_geo in all_sv_data.items():
        result[geo] = dict()
        for sv, sv_data in data_for_geo.get('statVarData', {}).items():
            most_recent_date = None
            for source in sv_data.get('sourceSeries', []):
                source_values = source.get('val', {})
                if len(source_values.keys()) < 1:
                    continue
                sorted_dates = sorted(source_values.keys())
                if not most_recent_date or sorted_dates[-1] > most_recent_date:
                    most_recent_date = sorted_dates[-1]
                    result[geo][sv] = {
                        'data': source_values,
                        'provenanceDomain': source.get('provenanceDomain', '')
                    }
    return result


@bp.route('/choroplethdata/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def choropleth_data(dcid):
    """
    Get stats var data needed for choropleth charts for a given place

    API Returns:
        Dictionary with
            key as stat var
            value as object with date,dictionary of place: value, number of data points, exploreUrl, list of sources
    """
    all_stat_vars, choropleth_configs = get_choropleth_sv()
    geos, _ = get_choropleth_places(dcid)
    if not all_stat_vars or not geos:
        return Response(json.dumps({}), 200, mimetype='application/json')
    # Get data for all the stat vars for every place we will need and process the data
    all_sv_data = dc_service.get_stats_all(geos, list(all_stat_vars))
    if not 'placeData' in all_sv_data:
        return Response(json.dumps({}), 200, mimetype='application/json')
    processed_data = process_choropleth_data(all_sv_data['placeData'])

    result = {}
    for cc in choropleth_configs:
        # we should only be making choropleths for configs with a single stat var
        sv = cc['statsVars'][0]
        cc_data, statvar_denom = landing_page_api.get_snapshot_across_places(
            cc, processed_data, geos)
        data_values = cc_data.get('data', [])
        data_dict = dict()
        scaling = cc.get('scaling', 1)
        if 'relatedChart' in cc:
            scaling = cc['relatedChart'].get('scaling', scaling)
        for value in data_values:
            if 'dcid' not in value or 'data' not in value:
                continue
            val = value['data'].get(sv, None)
            if val:
                val = val * scaling
            data_dict[value['dcid']] = val
        is_scaled = (('relatedChart' in cc and
                      cc['relatedChart'].get('scale', False)) or
                     ('denominator' in cc))
        exploreUrl = landing_page_api.build_url([dcid], statvar_denom,
                                                is_scaled)
        cc_result = {
            'date': cc_data.get('date', None),
            'data': data_dict,
            'numDataPoints': len(data_values),
            # TODO (chejennifer): exploreUrl should link to choropleth tool once the tool is ready
            'exploreUrl': exploreUrl,
            'sources': cc_data.get('sources', [])
        }
        result[sv] = cc_result
    return Response(json.dumps(result), 200, mimetype='application/json')
