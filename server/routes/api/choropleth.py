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
import flask
import statistics
import json
import services.datacommons as dc
import routes.api.place as place

# Map from a geographic level to its closest fine-grained level.
LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "City"
}

# All choropleth endpoints are defined with the choropleth/ prefix.
bp = flask.Blueprint(
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
    requested_geoDcid = flask.request.args.get("geoDcid")
    if not requested_geoDcid:
        return flask.jsonify({"error": "Must provide a 'geoDcid' field!"}, 400)
    stat_var = flask.request.args.get("statVar")
    if not stat_var:
        return flask.jsonify({"error": "Must provide a 'statVar' field!"}, 400)
    display_level = get_sublevel(requested_geoDcid,
                                 flask.request.args.get("level"))
    if not display_level:
        return flask.jsonify({"error":
           f"Failed to automatically resolve geographic subdivision level for" +
           f"{dcid}. Please provide a 'level' field manually."}, 400) 

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
    return flask.jsonify(populations_by_geo, 200)

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
    requested_geoDcid = flask.request.args.get("geoDcid")
    if not requested_geoDcid:
        return flask.jsonify({"error": "Must provide a 'geoDcid' field!"}, 400)
    display_level = get_sublevel(requested_geoDcid,
                                 flask.request.args.get("level"))
    if not display_level:
        return flask.jsonify({"error":
           f"Failed to automatically resolve geographic subdivision level for" +
           f"{dcid}. Please provide a 'level' field manually."}, 400) 

    # Get optional fields.
    measurement_denominator = flask.request.args.get("mdom",
                                                     default="Count_Person")

    # Get list of all contained places.
    geos_contained_in_place = dc.get_places_in(
            [requested_geoDcid], display_level).get(requested_geoDcid, [])


    # Download statistical variable, names, and geojson for subgeos.
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
                        "name": names_by_geo.get(geo_id, ["Unnamed Area"])[0],
                        "hasSublevel": 
                            (display_level in LEVEL_MAP),
                        "geoDcid": geo_id,
                    }
                }
            # Load, simplify, and add geoJSON coordinates.
            # Exclude geo if no or multiple renderings are present.
            if len(json_text) != 1:
                continue
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
    return flask.jsonify({
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "current_geo":
                names_by_geo.get(requested_geoDcid, ["Unnamed Area"])[0]
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
                                                        "typeOf")
        for level in requested_geoDcid_type.get(requested_geoDcid, []):
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

# Defines the map from higher geos to their respective subgeos.
SUB_GEO_LEVEL_MAP = {
    "Country": "AdministrativeArea1",
    "AdministrativeArea1": "AdministrativeArea2",
    "AdministrativeArea2": "City"
}
@bp.route('child/statvars')
def child_statvars():
    """
    Gets all statistical variables available for a particular sublevel of a
        dcid.
    API Params:
        dcid: The place dcid to pull information for, as a string.
        level: The level of children to pull for, as a string. If omitted,
            then the subgeo is computed.
    Example Query:
        api/place/child/statvars?dcid=country/USA&level=State
        Returns all statistical variables that are value for states of the USA.
    Returns:
        A json list of all the available statistical variables.
    """
    # Get required params.
    dcid = flask.request.args.get("dcid")
    if not dcid:
        return flask.jsonify({"error": "Must provide a 'dcid' field!"}, 400)
    requested_level = get_sublevel(dcid,
                                   flask.request.args.get("level"))
    if not requested_level:
        return flask.jsonify({"error":
           f"Failed to automatically resolve geographic subdivision level for" +
           f"{dcid}. Please provide a 'level' field manually."}, 400) 

    # Get sublevels.
    geos_contained_in_place = dc.get_places_in(
        [dcid], requested_level)
    if dcid not in geos_contained_in_place:
        return flask.jsonify({"error": "Internal server error."}, 500)
    geos_contained_in_place = geos_contained_in_place[dcid]

    # Get all available Statistical Variables for subgeos.
    # Only the union of the first 10 geos are returned for speed.
    # TODO(iancostello): Determine whether this heuristic is too generous
    # or too restrictive.
    stat_vars_for_subgeo = set()
    for geoId in geos_contained_in_place[:10]:
        stat_vars_for_subgeo = stat_vars_for_subgeo.union(
            place.statsvars(geoId))
    return json.dumps(list(stat_vars_for_subgeo))