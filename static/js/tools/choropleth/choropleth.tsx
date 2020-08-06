/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Creates and manages choropleth rendering.
 */

import React, { Component } from "react";
import axios from "axios";
import * as d3 from "d3";

class ChoroplethMap extends Component {
    constructor(props) {
        super(props);

        // Redirect to basic url if none provided.
        if (window.location.search == "") {
            window.location.search = "statVar=Count_Person_Employed&perCapita=t&geoId=country/USA"
        }
        
        // Add default state and bind function contexts.
        const urlParams = new URLSearchParams(window.location.search);
        this.state = {
            geojson: [],
            values: {},
            perCapita: (urlParams.has("perCapita")
                && (['t','true', '1']).includes(
                    urlParams.get("perCapita").toLowerCase()))
        }
        this.loadGeoJson = this.loadGeoJson.bind(this);
        this.renderGeoMap = this.renderGeoMap.bind(this);
        this.loadValues = this.loadValues.bind(this);
        this.handleMapHover = this.handleMapHover.bind(this);
        this.updateGeoValues = this.updateGeoValues.bind(this);        
        this.loadGeoJson();
    }

    /**
     * Loads and renders blank GeoJson map for current geoId.
     * After loading, values for a particular StatVar are pulled.
     */
    loadGeoJson() {
        const urlParams = new URLSearchParams(window.location.search);
        var base_url = build_choropleth_url(
            ["perCapita", "geoId", "level", "mdom"],
            "/geo"
        );

        // Create request and generate map.
        axios.get(base_url).then((resp) => {
            this.setState({'geojson': resp.data[0]});
            this.renderGeoMap()
            this.loadValues();
        });  
    }

    /**
     * Loads values for the current geoId and updates map.
     */
    loadValues() {
        const urlParams = new URLSearchParams(window.location.search);
        var base_url = build_choropleth_url(
            ["geoId", "statVar"],
            "/values"
        );

        axios.get(base_url).then((resp) => {
            this.setState({'values': resp.data[0]});
            this.updateGeoValues();
        });
    }

    /**
     * Handles rendering the basic blank geoJson map.
     * Requires state geojson to be set with valid geoJson mapping object.
     */
    renderGeoMap() {
        // Combine path elements from D3 content.
        var geojson = this.state['geojson']
        var mapContent = d3
            .select("#main-pane g.map")
            .selectAll("path")
            .data(geojson.features);

        // Scale and center the map.
        var svg_container = document.getElementById("map_container");
        var projection = d3
            .geoAlbers()
            .fitSize([svg_container.clientWidth,
                      svg_container.clientHeight],
                      geojson);
        var geomap = d3.geoPath().projection(projection);

        // Build map objects.
        mapContent
            .enter()
            .append("path")
            .attr("d", geomap)
            // Add CSS class to each path for border outlining.
            .attr("class", "border")
            .attr("fill", "gray")
            // Add various event handlers.
            .on("mouseover", this.handleMapHover)
            .on("mouseleave", this.mouseLeave)
            .on("click", this.handleMapClick);

        this.setState({"mapContent": mapContent})

        // Create population map.
        var popMap = {}
        for (var index in geojson.features) {
            var content = geojson.features[index]
            popMap[content.id] = content.properties.pop
        }
        this.setState({ popMap })
    }

    /**
     * Updates geoJson map with current values loaded in state.
     * Requires geoJson map to be rendered and state values to be set.
     */
    updateGeoValues() {
        var values = this.state['values']
        var isPerCapita = this.state['perCapita']

        // Build chart display options.
        var colorScale = d3
            .scaleLinear()
            .domain(determineColorPalette(values,
                this.state['perCapita'], this.state['popMap']))
            .range(["#deebf7", "#9ecae1", "#3182bd"] as any);

        // Bind to current map.
        var geojson = this.state['geojson']
        var mapContent = d3
            .select("#main-pane g.map")
            .selectAll("path")
            .data(geojson.features);
        
        // Create new infill.
        mapContent
            .attr("fill", function 
                    (d : { properties: { geoId : string, pop : number }}) {
                if (d.properties.geoId in values) {
                    let value = values[d.properties.geoId];
                    if (isPerCapita) {
                        if (d.properties.hasOwnProperty("pop")) {
                            return colorScale(value / d.properties.pop);
                        }
                        return "gray";
                    }
                    return colorScale(value);
                } else {
                    return "gray";
                }
            })
    }

    /**
     * Capture hover event on geo and displays relevant information.
     * @param {json} geo is the geoJson content for the hovered geo.
     */
    handleMapHover(geo) {
        // Display statistical variable information on hover.
        let name = geo.properties.name;
        let geoId = geo.properties.geoId;
        let values = this.state['values']
        let geoValue : any = "No Value"
        if (geoId in values) {
            geoValue = values[geoId];
            if (this.state['perCapita']) {
                if (geo.properties.hasOwnProperty("pop")) {
                    geoValue /= geo.properties.pop;
                }
            }
        }

        document.getElementById("hover-text-display").innerHTML =
            name + " - " + geoValue.toLocaleString();        
    
        // Highlight selected geo in black on hover.
        d3.select(geo.ref).attr("class", "border-highlighted");
    }

    handleStatVarChange(statVar) {
        // TODO(iancostello): Update browser.
        var base_url = build_choropleth_url(
            ["geoId", "bc", "perCapita", "level", "mdom"],
            ""
        );
        base_url += "&statVar=" + statVar
        history.pushState({}, null, base_url);
        this.loadValues()
    }
  
    /**
     * Clears output after leaving a geo.
     */
    mouseLeave(geo) {
        // Remove hover text.
        document.getElementById("hover-text-display").innerHTML = "";
    
        // Remove geo display effect.
        d3.select(geo.ref).attr("class", "border");
    }
    
    /**
     * Capture click event on geo and zooms
     * user into that geo in the choropleth tool.
     * @param {json} geo is the geoJson content for the clicked geo.
     */
    handleMapClick(geo) {
        if (geo.properties.hasSublevel) {
            redirectToGeo(geo.properties.geoId);
        } else {
            //TODO(iancostello): Improve this feature (change cursor)
            alert("This geo has no further sublevels!");
        }
    }

    render() {
        return (
            <React.Fragment>
                <svg id="map_container" width="800px" height="500px">
                    <g className="map"></g> 
                </svg>
            </React.Fragment>
        )
    }
}

/**
 * Builds a redirect link given the fields to include from search params.
 * @param fields_to_include
 * @param from_api whether the url should be to the api or locally.
 */
function build_choropleth_url(fields_to_include, req_point) {
    //TODO(iancostello): Make this path relative.
    var base_url = document.location.origin + document.location.pathname;
    base_url += req_point;
    base_url += "?";
    const urlParams = new URLSearchParams(window.location.search);
    for (let index in fields_to_include) {
      let arg_name = fields_to_include[index];
      let arg_value = urlParams.get(arg_name);
      if (arg_value != null) {
        base_url += "&" + arg_name + "=" + arg_value;
      }
    }
    return base_url;
}

/**
 * Redirects the webclient to a particular geo. Handles breadcrumbs in redirect.
 * @param {string} geoId to redirect to.
 */
function redirectToGeo(geoId) {
    var url = new URL(window.location.href);

    var base_url = build_choropleth_url(
      ["statVar", "perCapita", "level", "mdom"],
      ""
    );
    base_url += "&geoId=" + geoId;
    base_url += "&bc=";
  
    // Add or create breadcrumbs field.
    // TODO(iancostello): Use parent places api.
    var breadcrumbs = url.searchParams.get("bc");
    if (breadcrumbs != null && breadcrumbs != "") {
      base_url += breadcrumbs + ";";
    }
    base_url += url.searchParams.get("geoId");
    window.location.href = base_url;
}
  
/**
 * Generates the breadcrumbs text from browser url.
 */
function generateBreadCrumbs() {
    var url = new URL(window.location.href);

    var breadcrumbs = url.searchParams.get("bc");
    if (breadcrumbs != null && breadcrumbs != "") {
        var breadcrumbs_display = document.getElementById("breadcrumbs");
        var crumbs = breadcrumbs.split(";");

        // Build url for each reference in the breadcrumbs.
        var base_url = build_choropleth_url(
        ["statVar", "perCapita", "level", "mdom"],
        ""
        );
        base_url += "&geoId=";

        var breadcrumbs_upto = "";
        for (let index in crumbs) {
            let level_ref = crumbs[index];

            if (level_ref != "") {
                // TODO(iancostello): Turn into react component to sanitize.
                let curr_url = base_url + level_ref + "&bc=" + breadcrumbs_upto;
                breadcrumbs_display.innerHTML +=
                '<a href="' + curr_url + '">' + level_ref + "</a>" + " > ";
                breadcrumbs_upto += level_ref + ";";
            }
        }
        breadcrumbs_display.innerHTML += url.searchParams.get("geoId");
    }
}

/**
 * Returns domain of color palette as len 3 numerical array for plotting. 
 * @param dict of values mapping geoId to number returned by /values endpoint.
 * @param perCapita boolean if plotting perCapita.
 * @param popMap json object mapping geoId to total population.
 */
function determineColorPalette(dict, perCapita, popMap) {
    // Create a sorted list of values.
    var values = [];
    for (let key in dict) {
        if (perCapita) {
            if (popMap.hasOwnProperty(key)) {
                values.push(dict[key] / popMap[key])
            }
        } else {
            values.push(dict[key])
        }
    }
    values.sort(function(a, b){return a-b})
    let len = values.length;
    let lowerValue = values[0]
    let medianValue = values[len / 2]
    let upperValue = values[len - 1]
    return [lowerValue, medianValue, upperValue]
}
  

export { ChoroplethMap, generateBreadCrumbs }