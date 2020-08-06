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

# Defines the map from higher geos to their respective subgeos.
LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "City"
}

# All choropleth endpoints are defined with the choropleth/ prefix.
bp = Blueprint(
  "choropleth",
  __name__,
  url_prefix='/tools/choropleth'
)

@bp.route('/api')
def choropleth_api():
    """Returns data for geographic subregions for a certain statistical 
            variable.

    API Params: #TODO(iancostello): Split API calls up or move to client.
        statVar -> The statistical variable to download, as a string.
        perCapita -> Whether to return the per-capita value, as a string of a 
                boolean.
        geoId -> The currently viewed geography to render, as a string.
        level -> The subgeographic level to pull and display information for,
                as a string. Choices: Country, AdministrativeLevel[1/2], City.
        mdom -> The measurement denominator to use if perCapita is true, as a 
                string. Defaults to "Count_Person".


    API Returns:
        df -> Returns a dictionary with two entries
            geoJson -> geoJson format that includes statistical variables info,
                    geoId, and name for all subregions.
            _PLOTTING_INFO -> Includes domain range for use in D3 and the
                    color palette to render with.
    """
    # Get required request parameters.
    requested_stat_var = request.args.get("statVar")
    if requested_stat_var is None:
        return jsonify({"error": "Must provide a 'statVar' field!"}, 400)
    requested_geoId = request.args.get("geoId")
    if requested_geoId is None:
        return jsonify({"error": "Must provide a 'geoId' field!"}, 400)

    # If no level is requested then default to one level below current.
    display_level = request.args.get("level")
    if display_level is None:
        requested_geoId_type = dc.get_property_values([requested_geoId],
                                                "typeOf")[requested_geoId]
        # TODO(iancostello): Handle a failed function call, e.g., returns None.
        # TODO(iancostello): Handle the case where display_level is None.
        for level in requested_geoId_type:
            if level in LEVEL_MAP:
                display_level = LEVEL_MAP[level]
                break

    # Get optional fields.
    per_capita = request.args.get("perCapita", default=False).lower() in (
        ["true", "1", "t"])
    measurement_denominator = request.args.get("mdom", default="Count_Person")

    # Get list of all contained places.
    # TODO(iancostello): Handle a failing function call.
    geos_contained_in_place = dc.get_places_in(
            [requested_geoId], display_level)[requested_geoId]

    # Download statistical variable, names, and geojson for subgeos.
    # TODO(iancostello): Handle failing function calls. 
    # Also, handle the case where only a fraction of values are returned.
    # TODO: Potentially move these calls to the client.
    stat_var_by_geo = dc.get_stats(geos_contained_in_place,
                                   requested_stat_var)
    names_by_geo = dc.get_property_values(geos_contained_in_place,
                                          "name")
    geojson_by_geo = dc.get_property_values(geos_contained_in_place,
                                            "geoJsonCoordinates")

    # Download population data if per capita.
    population_by_geo = ({} if not per_capita
        else dc.get_stats(geos_contained_in_place, measurement_denominator))

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
                        "geoId": geo_id,
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
            if ('data' in stat_var_by_geo.get(geo_id, []) and
                    (not per_capita or
                    'data' in population_by_geo.get(geo_id, []))):
                # Grab the latest available data.
                stat_obs = next(iter(
                    reversed(stat_var_by_geo[geo_id]['data'].values())))

                # Handle per-capita option.
                if per_capita:
                    # Note that this could be from a different period from the
                    # statistical variable.
                    # TODO(iancostello): Determine how to handle populations 
                    # and statistical values from different times.
                    pop = next(iter(
                        reversed(population_by_geo[geo_id]['data'].values())))
                    stat_obs /= pop

                values.append(stat_obs)
                geo_feature["properties"]["value"] = stat_obs

            # Add to main dataframe.
            features.append(geo_feature)
    # Generate plotting information from value list.
    domain, palette = determine_color_palette(values, per_capita)

    # Return as json payload.
    return jsonify({
        "geoJson": {
            "type": "FeatureCollection",
            "features": features
        },
        "_PLOTTING_INFO": {
            "domain": domain,
            "palette": palette
        }  
    }, 200)

def coerce_geojson_to_righthand_rule(geoJsonCords, obj_type):
    """Changes GeoJSON handedness to the right-hand rule.
    
    GeoJSON is stored in DataCommons in the reverse format of what D3
    expects. This results in geographies geometry being inverted. This function
    fixes these lists to be in the format expected by D3 and turns all polygons
    into multipolygons for downstream consistency.
        Args:
            geoJsonCords -> Nested list of geojson.
            obj_type -> Object feature type.
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

# TODO: Potentially move this to client.
def determine_color_palette(values, is_denominated):
    """Builds plotting range and color domain given a set of values.
        Percentage values use diverging palettes.
        Sequential data uses sequential palettes.

    Args:
        values -> List of all float values in the choropleth.
        is_denominated -> Whether the requested data has a measurement 
            denominator like per capita, as a boolean. 
    Returns:
        domain -> D3 numerical domain to use.
        palette -> Color palette to render with.
    """
    # Percentages use diverging palettes.
    lower_range = min(values)
    upper_range = max(values)
    palette = (['#998ec3', '#f7f7f7', '#f1a340'] if is_denominated
        else ['#deebf7', '#9ecae1', '#3182bd'])
    return [lower_range, statistics.median(values), upper_range], palette
