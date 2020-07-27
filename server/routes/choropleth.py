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
import numpy as np
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
  url_prefix='/choropleth'
)

@bp.route('/download')
def download():
    """Returns data for all countries for a certain statistical variable.

    API Params:
        statVar -> The statistical variable to download.
        perCapita -> Whether to return the per-capita value.
        place -> The currently viewed geography to render.

    API Returns:
        df -> dictionary of statistical variable values by country.
            Additionally includes some plotting information.
    """
    # Get required request parameters.
    stat_var_requested = request.args.get("statVar")
    if stat_var_requested is None:
        return jsonify({"error": "Must provide a 'statVar' field!"}, 400)
    place_requested = request.args.get("place")
    if place_requested is None:
        return jsonify({"error": "Must provide a 'place' field!"}, 400)

    # Get optional fields.
    per_capita = request.args.get("perCapita", default=False) == "true"

    # Get the type of the requested place. Accept first valid type.
    geolevel_below = dc.get_property_values([place_requested],
                                            "typeOf")[place_requested]
    for level in geolevel_below:
        if level in LEVEL_MAP:
            geolevel_below = level

    # Get list of all contained places.
    geos_contained_in_place = dc.get_places_in(
            [place_requested], LEVEL_MAP[geolevel_below])[place_requested]

    # Download statistical variable, names, and geojson for subgeos.
    stat_var_by_geo = dc.get_stats(geos_contained_in_place,
                                   stat_var_requested)
    names_by_geo = dc.get_property_values(geos_contained_in_place,
                                          "name")
    geojson_by_geo = dc.get_property_values(geos_contained_in_place,
                                            "geoJsonCoordinates")

    # Download population data if per capita.
    population_by_geo = {} if per_capita else \
        dc.get_stats(geos_contained_in_place, "Count_Person")

    # Process into combined json object.
    features, values = [], []
    for geo_id, json_text in geojson_by_geo.items():
        # Valid response needs at least geometry and a name.
        if len(json_text) > 0 and geo_id in names_by_geo:
            geo_feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "MultiPolygon",
                    },
                    "id": geo_id,
                    "properties": {
                        "name": names_by_geo[geo_id][0],
                        "hasSublevel": (geolevel_below != "City"),
                        "geoId": geo_id,
                    }
                }
            # Load, simplify, and add geoJSON coordinates.
            geojson = json.loads(json_text[0])
            geo_feature['geometry']['coordinates'] = \
                coerce_geojson_to_righthand_rule(
                                    geojson['coordinates'],
                                    geojson['type'])
            # Process Statistical Observation if valid.
            if geo_id in stat_var_by_geo and \
                    (not per_capita or geo_id in population_by_geo):
                # Grab the latest available data.
                stat_obs = next(iter(stat_var_by_geo[geo_id]['data'].values()))

                # Handle per-capita option.
                if per_capita:
                    # Note that this could be from a different period from the
                    # statistical variable.
                    pop = next(iter(population_by_geo[geo_id]['data'].values()))
                    stat_obs /= pop

                values.append(stat_obs)
                geo_feature["properties"]["value"] = stat_obs

            # Add to main dataframe.
            features.append(geo_feature)
    # Generate plotting information from value list.
    domain, palette = determine_color_palette(values)

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
    """GeoJSON is stored in DataCommons in the reverse format of what D3
    expects. This results in countries geometry being inverted. This function
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

def determine_color_palette(values):
    """Builds plotting range and color domain given a set of values.
        Percentage values use diverging palettes.
        Sequential data uses sequential palletes.

    Args:
        values -> List of all float values in the choropleth.
    Returns:
        scale_type, lower_domain, upper_domain, palette,
    """
    # Check if percentage.
    is_percentage = True
    for val in values:
        if abs(val) > 1:
            is_percentage = False
            break
    # Percentages use diverging palettes.
    if is_percentage:
        lower_range = np.quantile(values, 0.10)
        upper_range = np.quantile(values, 0.90)
        palette = ['#998ec3', '#f7f7f7', '#f1a340']
        return [lower_range, np.median(values), upper_range], palette
    # Linear palette otherwise.
    else:
        lower_range = np.quantile(values, 0.04)
        upper_range = np.quantile(values, 0.96)
        palette = ['#deebf7', '#9ecae1', '#3182bd']
        return [lower_range, np.median(values), upper_range], palette
