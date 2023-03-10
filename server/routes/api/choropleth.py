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
"""This module defines the endpoints that support drawing a choropleth map.
"""
import json
from typing import List
import urllib.parse

from flask import Blueprint
from flask import current_app
from flask import g
from flask import make_response
from flask import request
from flask import Response
from flask import send_file
from flask import url_for
from geojson_rewind import rewind

from server.cache import cache
import server.lib.util as lib_util
import server.routes.api.landing_page as landing_page_api
from server.routes.api.place import EQUIVALENT_PLACE_TYPES
import server.routes.api.place as place_api
from server.routes.api.shared import is_float
import server.routes.api.shared as shared_api
import server.services.datacommons as dc

# Define blueprint
bp = Blueprint("choropleth", __name__, url_prefix='/api/choropleth')

# Place type to get choropleth for, keyed by place type
# TODO: Come up with a catch all way to determine place type to get choropleth for because
# this works for US places, but hierarchy of places in other countries may be different
CHOROPLETH_DISPLAY_LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "State": "County",
    "County": "County",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "AdministrativeArea2",
    "AdministrativeArea3": "AdministrativeArea3"
}

# Place type to get choropleth for, keyed by geoDcid
# These are the special cases.
# 1. Territories of the US, e.g. country/USA, are also AA1. Restrict this view to only States.
# 2. For Earth, display the countries.
SPECIAL_CHOROPLETH_DISPLAY_LEVEL_MAP = {
    "country/USA": "State",
    "Earth": "Country"
}

# GeoJSON property to use, keyed by display level.
CHOROPLETH_GEOJSON_PROPERTY_MAP = {
    "Country": "geoJsonCoordinatesDP3",
    "State": "geoJsonCoordinatesDP3",
    "AdministrativeArea1": "geoJsonCoordinatesDP3",
    "County": "geoJsonCoordinatesDP1",
    "AdministrativeArea2": "geoJsonCoordinatesDP1",
    "AdministrativeArea3": "geoJsonCoordinatesDP1",
    "EurostatNUTS1": "geoJsonCoordinatesDP2",
    "EurostatNUTS2": "geoJsonCoordinatesDP2",
    "EurostatNUTS3": "geoJsonCoordinatesDP1",
    "IPCCPlace_50": "geoJsonCoordinates",
}
MULTILINE_GEOJSON_TYPE = "MultiLineString"
MULTIPOLYGON_GEOJSON_TYPE = "MultiPolygon"
POLYGON_GEOJSON_TYPE = "Polygon"


@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def get_choropleth_display_level(geoDcid):
  """ Get the display level of places to show on a choropleth chart for a
  given place.

  Args:
      geoDcid: dcid of the place of interest

  Returns:
      tuple consisting of:
          dcid of the enclosing place to use (if the display level and the
              place type of the geoDcid arg are the same, this would be the
              parent place dcid)
          display level (AdministrativeArea1 or AdministrativeArea2)
  """
  if geoDcid in SPECIAL_CHOROPLETH_DISPLAY_LEVEL_MAP:
    display_level = SPECIAL_CHOROPLETH_DISPLAY_LEVEL_MAP[geoDcid]
    return geoDcid, display_level

  place_type = place_api.get_place_type(geoDcid)
  display_level = None
  if place_type in CHOROPLETH_DISPLAY_LEVEL_MAP:
    display_level = CHOROPLETH_DISPLAY_LEVEL_MAP[place_type]
  elif place_type in EQUIVALENT_PLACE_TYPES and EQUIVALENT_PLACE_TYPES[
      place_type] in CHOROPLETH_DISPLAY_LEVEL_MAP:
    place_type = EQUIVALENT_PLACE_TYPES[place_type]
    display_level = CHOROPLETH_DISPLAY_LEVEL_MAP[place_type]
  else:
    return None, None

  if place_type == display_level:
    parents_places = place_api.parent_places(geoDcid)
    # Multiple place types can be equivalent (eg. County and AA2) and we
    # want to find the parent who's display level is equivalent to the
    # geoDcid display_level
    target_display_levels = set([display_level])
    if display_level in EQUIVALENT_PLACE_TYPES:
      target_display_levels.add(EQUIVALENT_PLACE_TYPES[display_level])
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
        if parent_display_level in target_display_levels:
          return parent_dcid, display_level
    return None, None
  else:
    return geoDcid, display_level


def get_multipolygon_geojson_coordinates(geojson):
  """
  Gets geojson coordinates in the form of multipolygon geojson coordinates that
  are in the reverse of the righthand_rule.

  GeoJSON is stored in DataCommons following the right hand rule as per rfc
  spec (https://www.rfc-editor.org/rfc/rfc7946). However, d3 requires geoJSON
  that violates the right hand rule (see explanation on d3 winding order here:
  https://stackoverflow.com/a/49311635). This function returns coordinates in
  the format expected by D3 and turns all polygons into multipolygons for
  downstream consistency.
      Args:
          geojson: geojson of type MultiPolygon or Polygon
      Returns:
          Nested list of geo coordinates.
  """
  # The geojson data for each place varies in whether it follows the
  # righthand rule or not. We want to ensure geojsons for all places
  # does follow the righthand rule.
  right_handed_geojson = rewind(geojson)
  geojson_type = right_handed_geojson['type']
  geojson_coords = right_handed_geojson['coordinates']
  if geojson_type == POLYGON_GEOJSON_TYPE:
    geojson_coords[0].reverse()
    return [geojson_coords]
  elif geojson_type == MULTIPOLYGON_GEOJSON_TYPE:
    for polygon in geojson_coords:
      polygon[0].reverse()
    return geojson_coords
  else:
    assert False, f"Type {geojson_type} unknown!"


def get_geojson_feature(geo_id: str, geo_name: str, json_text: List[str]):
  """
  Gets a single geojson feature from a list of json strings
  """
  # Exclude geo if no renderings are present.
  if len(json_text) < 1:
    return None
  geojson = json.loads(json_text[0])
  geo_feature = {
      "type": "Feature",
      "id": geo_id,
      "properties": {
          "name": geo_name,
          "geoDcid": geo_id,
      }
  }
  geojson_type = geojson.get("type", "")
  if geojson_type == MULTILINE_GEOJSON_TYPE:
    geo_feature['geometry'] = geojson
  elif geojson_type == POLYGON_GEOJSON_TYPE or geojson_type == MULTIPOLYGON_GEOJSON_TYPE:
    coordinates = get_multipolygon_geojson_coordinates(geojson)
    geo_feature['geometry'] = {
        "type": "MultiPolygon",
        "coordinates": coordinates
    }
  else:
    geo_feature = None
  return geo_feature


@bp.route('/geojson')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def geojson():
  """Get geoJson data for places enclosed within the given dcid"""
  place_dcid = request.args.get("placeDcid")
  if not place_dcid:
    return Response(json.dumps("error: must provide a placeDcid field"),
                    400,
                    mimetype='application/json')
  place_type = request.args.get("placeType")
  if not place_type:
    place_dcid, place_type = get_choropleth_display_level(place_dcid)
  cached_geojson = current_app.config['CACHED_GEOJSONS'].get(
      place_dcid, {}).get(place_type, None)
  if cached_geojson:
    return lib_util.gzip_compress_response(cached_geojson, is_json=True)
  geos = []
  if place_dcid and place_type:
    geos = dc.get_places_in([place_dcid], place_type).get(place_dcid, [])
  if not geos:
    return Response(json.dumps({}), 200, mimetype='application/json')
  geojson_prop = CHOROPLETH_GEOJSON_PROPERTY_MAP.get(place_type, "")
  # geoId/72 needs higher resolution geojson because otherwise, the map looks
  # too fragmented
  if place_dcid == 'geoId/72':
    geojson_prop = 'geoJsonCoordinatesDP1'
  names_by_geo = place_api.get_display_name('^'.join(geos), g.locale)
  features = []
  if geojson_prop:
    geojson_by_geo = dc.property_values(geos, geojson_prop)
    # geoId/46102 is known to only have unsimplified geojson so need to use
    # geoJsonCoordinates as the prop for this one place
    if 'geoId/46102' in geojson_by_geo:
      geojson_by_geo['geoId/46102'] = dc.property_values(
          ['geoId/46102'], 'geoJsonCoordinates').get('geoId/46102', '')
    for geo_id, json_text in geojson_by_geo.items():
      if json_text and geo_id in names_by_geo:
        geo_name = names_by_geo.get(geo_id, "Unnamed Area")
        geo_feature = get_geojson_feature(geo_id, geo_name, json_text)
        if geo_feature:
          features.append(geo_feature)
  result = {
      "type": "FeatureCollection",
      "features": features,
      "properties": {
          "current_geo": place_dcid
      }
  }
  return lib_util.gzip_compress_response(result, is_json=True)


@bp.route('/node-geojson', methods=['POST'])
def node_geojson():
  """Gets geoJson data for a list of nodes and a specified property to use to
     get the geoJson data"""
  nodes = request.json.get("nodes", [])
  geojson_prop = request.json.get("geoJsonProp")
  if not geojson_prop:
    return "error: must provide a geoJsonProp field", 400
  features = []
  geojson_by_node = dc.property_values(nodes, geojson_prop)
  for node_id, json_text in geojson_by_node.items():
    if json_text:
      geo_feature = get_geojson_feature(node_id, node_id, json_text)
      if geo_feature:
        features.append(geo_feature)
  result = {
      "type": "FeatureCollection",
      "features": features,
      "properties": {
          "current_geo": ""
      }
  }
  return Response(json.dumps(result), 200, mimetype='application/json')


def get_choropleth_configs():
  """ Gets all the chart configs that have choropleth charts

  Returns:
      list of chart configs that are choropleth chart configs
  """
  chart_config = current_app.config['CHART_CONFIG']
  chart_configs = []
  for config in chart_config:
    if config.get('isChoropleth', False):
      chart_configs.append(config)
  return chart_configs


def get_denom_val(stat_date, denom_data):
  """ Gets the best denominator value for a given date

  Args:
      stat_date: date as a string
      denom_data: a list of observation points

  Returns:
      the value from denom_data that best matches the stat_date
  """
  if len(denom_data) == 1:
    return denom_data[0]['value']
  target_date = lib_util.parse_date(stat_date)
  best = 0
  best_date = lib_util.parse_date(denom_data[0]['date'])
  for i in range(1, len(denom_data)):
    curr_date = lib_util.parse_date(denom_data[i]['date'])
    if abs(curr_date - target_date) < abs(best_date - target_date):
      best = i
      best_date = curr_date
    else:
      return denom_data[best]['value']
  return denom_data[best]['value']


def get_value(sv_data, denom, denom_data, scaling):
  """ Gets the processed value for a place

  Args:
      place_dcid: dcid of the place of interest as a string
      sv_data: the stat var data for the place of interest as an object with
          the fields value, date, and metadata
      denom: the denom stat var if there is one as a string
      denom_data: the denom data for the denom stat var with the form:
          {
              series: [
                  {
                      "date": "2011",
                      "value": 12000
                  }
                  ...
              ],
              facet: "facetId"
          }
      scaling: number the value should be multiplied by

  Returns:
      processed value as a number
  """
  val = sv_data.get('value', None)
  if not val:
    return None
  if denom:
    if 'series' not in denom_data:
      return None
    date = sv_data.get('date', "")
    denom_val = get_denom_val(date, denom_data['series'])
    if not denom_val:
      return None
    val = val / denom_val
  return val * scaling


@bp.route('/data/<path:dcid>')
@cache.memoize(timeout=3600 * 24)  # Cache for one day.
def choropleth_data(dcid):
  """Get stats var data needed for choropleth charts for a given place

  API Returns:
      {
          [stat var]: {
              date: string,
              data: {
                  [dcid]: number,
                  ...
              },
              numDataPoints: number,
              exploreUrl: string,
              sources: [],
          },
          ...
      }
  """
  configs = get_choropleth_configs()
  stat_vars, denoms = shared_api.get_stat_vars(configs)
  display_dcid, display_level = get_choropleth_display_level(dcid)
  geos = []
  if display_dcid and display_level:
    geos = dc.get_places_in([display_dcid], display_level).get(display_dcid, [])
  if not stat_vars or not geos:
    return Response(json.dumps({}), 200, mimetype='application/json')
  # Get data for all the stat vars for every place we will need and process the data
  numerator_resp = lib_util.point_within_core(display_dcid, display_level,
                                              list(stat_vars), '', False)
  denominator_resp = lib_util.series_core(list(geos), list(denoms), False)

  result = {}
  # Process the data for each config
  for cc in configs:
    # we should only be making choropleths for configs with a single stat var
    sv = cc['statsVars'][0]
    cc_sv_data_values = numerator_resp.get('data', {}).get(sv, {})
    denom = landing_page_api.get_denom(cc, True)
    cc_denom_data = denominator_resp.get('data', {}).get(denom, {})
    scaling = cc.get('scaling', 1)
    if 'relatedChart' in cc:
      scaling = cc['relatedChart'].get('scaling', scaling)
    sources = set()
    dates = set()
    data_dict = dict()
    # Process the data for each place we have stat var data for
    for place_dcid in cc_sv_data_values:
      dcid_sv_data = cc_sv_data_values.get(place_dcid, {})
      place_denom_data = cc_denom_data.get(place_dcid, {})
      # process and then update data_dict with the value for this
      # place_dcid
      val = get_value(dcid_sv_data, denom, place_denom_data, scaling)
      if not val:
        continue
      data_dict[place_dcid] = val
      # add the date of the stat var value for this place_dcid to the set
      # of dates
      dates.add(dcid_sv_data.get('date', ''))
      # add stat var source and denom source (if there is a denom) to the
      # set of sources
      facetId = dcid_sv_data.get('facet', '')
      source = numerator_resp['facets'].get(facetId,
                                            {}).get('provenanceUrl', '')
      sources.add(source)
      if denom:
        facetId = place_denom_data['facet']
        source = denominator_resp['facets'].get(facetId,
                                                {}).get('provenanceUrl', '')
        sources.add(source)
    # build the exploreUrl
    # TODO: webdriver test to test that the right choropleth loads
    is_scaled = (('relatedChart' in cc and
                  cc['relatedChart'].get('scale', False)) or
                 ('denominator' in cc))
    url_anchor = '&pd={}&ept={}&sv={}'.format(dcid, display_level, sv)
    if is_scaled:
      url_anchor += "&pc=1"
    explore_url = urllib.parse.unquote(url_for('tools.map', _anchor=url_anchor))
    # process the set of sources and set of dates collected for this chart
    # config
    sources = filter(lambda x: x != "", sources)
    date_range = shared_api.get_date_range(dates)
    # build the result for this chart config and add it to the result
    cc_result = {
        'date': date_range,
        'data': data_dict,
        'numDataPoints': len(data_dict.values()),
        # TODO (chejennifer): exploreUrl should link to choropleth tool once the tool is ready
        'exploreUrl': explore_url,
        'sources': sorted(list(sources))
    }
    result[sv] = cc_result
  return Response(json.dumps(result), 200, mimetype='application/json')


@bp.route('/map-points')
@cache.cached(timeout=3600 * 24, query_string=True)  # Cache for one day.
def get_map_points():
  """Get map point data for the given place type enclosed within the given dcid
  """
  place_dcid = request.args.get("placeDcid")
  if not place_dcid:
    return Response(json.dumps("error: must provide a placeDcid field"),
                    400,
                    mimetype='application/json')
  place_type = request.args.get("placeType")
  if not place_type:
    return Response(json.dumps("error: must provide a placeType field"),
                    400,
                    mimetype='application/json')
  geos = []
  geos = dc.get_places_in([place_dcid], place_type).get(place_dcid, [])
  if not geos:
    return Response(json.dumps({}), 200, mimetype='application/json')
  names_by_geo = place_api.get_display_name('^'.join(geos), g.locale)
  # For some places, lat long is attached to the place node, but for other
  # places, the lat long is attached to the location value of the place node.
  # If a place has location, we will use the location value to find the lat
  # and long.
  # eg. epaGhgrpFacilityId/1003010 has latitude and longitude but no location
  # epa/120814013 which is an AirQualitySite has a location, but no latitude
  # or longitude
  location_by_geo = dc.property_values(geos, "location")
  # dict of <dcid used to get latlon>: <dcid of the place>
  geo_by_latlon_subject = {}
  for geo_dcid in geos:
    if location_by_geo[geo_dcid]:
      location_dcid = location_by_geo[geo_dcid][0]
      geo_by_latlon_subject[location_dcid] = geo_dcid
    else:
      geo_by_latlon_subject[geo_dcid] = geo_dcid
  lat_by_subject = dc.property_values(list(geo_by_latlon_subject.keys()),
                                      "latitude")
  lon_by_subject = dc.property_values(list(geo_by_latlon_subject.keys()),
                                      "longitude")

  map_points_list = []
  for subject_dcid, latitude in lat_by_subject.items():
    longitude = lon_by_subject.get(subject_dcid, [])
    if len(latitude) == 0 or len(longitude) == 0:
      continue
    if not is_float(latitude[0]) or not is_float(longitude[0]):
      continue
    geo_id = geo_by_latlon_subject.get(subject_dcid, "")
    map_point = {
        "placeDcid": geo_id,
        "placeName": names_by_geo.get(geo_id, "Unnamed Place"),
        "latitude": float(latitude[0]),
        "longitude": float(longitude[0])
    }
    map_points_list.append(map_point)
  return Response(json.dumps(map_points_list), 200, mimetype='application/json')


@bp.route('/geotiff')
def get_geotiff():
  # TODO should get geotiff from mixer given some parameters
  response = make_response(
      send_file("test_county.tif",
                mimetype='image/tiff',
                as_attachment=True,
                cache_timeout=0))
  return response
