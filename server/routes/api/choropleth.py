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

"""Defines endpoints to support choropleth map."""

from flask import request
from flask import jsonify
from flask import Blueprint
import statistics
import json
import services.datacommons as dc

# Map from a geographic level to its closest fine-grained level.
LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "City"
}

# All choropleth endpoints are defined with the choropleth/ prefix.
bp = Blueprint(
  "choropleth",
  __name__,
  url_prefix='/api/choropleth'
)

@bp.route('/values')
def choropleth_values():
    """Returns data for geographic subregions for a certain statistical 
            variable.

    API Params:
        geoDcid: The currently viewed geography to render, as a string.
        level: The subgeographic level to pull and display information for,
                as a string. Choices: Country, AdministrativeLevel[1/2], City.
        statVar: The statistical variable to pull data about.

    API Returns:
        values: dictionary of geo to statistical variable values (as a float)
            for all subgeos.
    """
    # Get required request parameters.
    requested_geoDcid = request.args.get("geoDcid")
    if not requested_geoDcid:
        return jsonify({"error": "Must provide a 'geoDcid' field!"}, 400)
    stat_var = request.args.get("statVar")
    if not stat_var:
        return jsonify({"error": "Must provide a 'statVar' field!"}, 400)
    display_level = get_sublevel(requested_geoDcid, request.args.get("level"))

    # Get all subgeos.
    geos_contained_in_place = dc.get_places_in(
            [requested_geoDcid], display_level).get(requested_geoDcid, [])
    values_by_geo = dc.get_stats(geos_contained_in_place, stat_var)

    # Add to dictionary for response.
    populations_by_geo = {}
    for geo_id, payload in values_by_geo.items():
        if "data" in payload:
            populations_by_geo[geo_id] = next(iter(
                        reversed(payload['data'].values())))

    # Return as json payload.
    return jsonify(populations_by_geo, 200)

@bp.route('/geo')
def choropleth_geo():
    """Returns data for geographic subregions for a certain statistical 
            variable.

    API Params:
        geoDcid: The currently viewed geography to render, as a string.
        level: The subgeographic level to pull and display information for,
                as a string. Choices: Country, AdministrativeLevel[1/2], City.
        mdom: The measurement denominator to use as a string.
            Defaults to "Count_Person".


    API Returns:
        geoJson: geoJson format that includes statistical variables info,
            geoDcid, and name for all subregions.
    """
    # Get required request parameters.
    requested_geoDcid = request.args.get("geoDcid")
    if not requested_geoDcid:
        return jsonify({"error": "Must provide a 'geoDcid' field!"}, 400)
    display_level = get_sublevel(requested_geoDcid, request.args.get("level"))

    # Get optional fields.
    measurement_denominator = request.args.get("mdom", default="Count_Person")

    # Get list of all contained places.
    # TODO(iancostello): Handle a failing function call.
    geos_contained_in_place = dc.get_places_in(
            [requested_geoDcid], display_level)[requested_geoDcid]

    # Download statistical variable, names, and geojson for subgeos.
    # TODO(iancostello): Handle failing function calls. 
    # Also, handle the case where only a fraction of values are returned.
    names_by_geo = dc.get_property_values(geos_contained_in_place
                                          + [requested_geoDcid],
                                          "name")
    geojson_by_geo = dc.get_property_values(geos_contained_in_place,
                                            "geoJsonCoordinates")

    # Download population data if per capita.
    # TODO(iancostello): Determine how to handle populations 
    # and statistical values from different times.
    population_by_geo = dc.get_stats(geos_contained_in_place,
                                     measurement_denominator)

    # Process into a combined json object.
    features, values = [], []
    for geo_id, json_text in geojson_by_geo.items():
        # Valid response needs at least geometry and a name.
        if json_text and geo_id in names_by_geo:
            geo_feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "MultiPolygon",
                    },
                    "id": geo_id,
                    "properties": {
                        # Choose the first name when multiple are present.
                        # TODO(iancostello): Implement a better approach.
                        "name": names_by_geo[geo_id][0],
                        "hasSublevel": 
                            (display_level in LEVEL_MAP),
                        "geoDcid": geo_id,
                    }
                }
            # Load, simplify, and add geoJSON coordinates.
            # First returned value is chosen always.
            # TODO(iancostello): Implement a better approach.
            geojson = json.loads(json_text[0])
            geo_feature['geometry']['coordinates'] = (
                coerce_geojson_to_righthand_rule(
                                    geojson['coordinates'],
                                    geojson['type']))
            # Process Statistical Observation if valid.
            if ('data' in population_by_geo.get(geo_id, [])):
                # Grab the latest available data.
                geo_feature["properties"]["pop"] = next(iter(
                    reversed(population_by_geo[geo_id]['data'].values())))

            # Add to main dataframe.
            features.append(geo_feature)

    # Return as json payload.
    return jsonify({
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            # TODO(iancostello): Don't just pick the first and check.
            "current_geo": names_by_geo[requested_geoDcid][0]
        }
    }, 200)

def get_sublevel(requested_geoDcid, display_level):
    """Returns the best sublevel display for a geoDcid.

    Args:
        requested_geoDcid: The parent geo DCID to find children.
        display_level: Display level provided or None. Valid display_levels
            are [AdministrativeLevel1, AdministrativeLevel2, City]
    Returns:
       Directly returns display_level argument if it is not none.
        Otherwise the next sublevel below the parent is returned.
    """
    if not display_level:
        requested_geoDcid_type = dc.get_property_values([requested_geoDcid],
                                                "typeOf")[requested_geoDcid]
        # TODO(iancostello): Handle a failed function call, e.g., returns None.
        # TODO(iancostello): Handle the case where display_level is None.
        for level in requested_geoDcid_type:
            if level in LEVEL_MAP:
                return LEVEL_MAP[level]
    return display_level

def coerce_geojson_to_righthand_rule(geoJsonCords, obj_type):
    """Changes GeoJSON handedness to the right-hand rule.
    
    GeoJSON is stored in DataCommons in the reverse format of what D3
    expects. This results in geographies geometry being inverted. This function
    fixes these lists to be in the format expected by D3 and turns all polygons
    into multipolygons for downstream consistency.
        Args:
            geoJsonCords: Nested list of geojson.
            obj_type: Object feature type.
        Returns:
            Nested list of geocoords.
    """
    if obj_type == "Polygon":
        geoJsonCords[0].reverse()
        return [geoJsonCords]
    elif obj_type == "MultiPolygon":
        for polygon in geoJsonCords:
            polygon[0].reverse()
        return geoJsonCords
    else:
        assert False, f"Type {obj_type} unknown!"
