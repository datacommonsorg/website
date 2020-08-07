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
    constructor(props: any) {
        super(props);

        // Redirect to basic url if none provided.
        if (window.location.search === "") {
            window.location.search = "statVar=Count_Person_Employed&pc=t&geoDcid=country/USA";
        }
        
        // Add default state and bind function contexts.
        const urlParams = new URLSearchParams(window.location.search);
        this.state = {
            geojson: [],
            pc: (urlParams.has("pc")
                && (["t","true", "1"]).includes(
                    urlParams.get("pc").toLowerCase())),
            values: {},
        };
        this.loadGeoJson = this.loadGeoJson.bind(this);
        this.renderGeoMap = this.renderGeoMap.bind(this);
        this.loadValues = this.loadValues.bind(this);
        this.handleMapHover = this.handleMapHover.bind(this);
        this.updateGeoValues = this.updateGeoValues.bind(this);        
        this.loadGeoJson();
    }

    /**
     * Loads and renders blank GeoJson map for current geoDcid.
     * After loading, values for a particular StatVar are pulled.
     */
    loadGeoJson() {
        const urlParams = new URLSearchParams(window.location.search);
        let geoUrl = "/api/choropleth/geo";
        geoUrl += buildChoroplethParams(
            ["pc", "geoDcid", "level", "mdom"]);
        let valueUrl = "/api/choropleth/values";
        valueUrl += buildChoroplethParams(
                ["geoDcid", "statVar"]);

        // Cxreate request and generate map.
        const geoPromise = axios.get(geoUrl)
        const valuePromise = axios.get(valueUrl)
        
        Promise.all([geoPromise, valuePromise]).then((values) => {
            this.setState({"geojson": values[0].data[0],
                           "values": values[1].data[0]});
            //TODO(iancostello): Investigate if this can be moved to 
            //shouldComponentUpdate.
            this.renderGeoMap();
            this.updateGeoValues();
        });
    }

    /**
     * Loads values for the current geoDcid and updates map.
     */
    loadValues() {
        const urlParams = new URLSearchParams(window.location.search);
        let baseUrl = "/api/choropleth/values";
        baseUrl += buildChoroplethParams(
            ["geoDcid", "statVar"]);

        axios.get(baseUrl).then((resp) => {
            this.setState({"values": resp.data[0]});
            this.updateGeoValues();
        });
    }

    /**
     * Handles rendering the basic blank geoJson map.
     * Requires state geojson to be set with valid geoJson mapping object.
     */
    renderGeoMap() {
        // Combine path elements from D3 content.
        var geojson = this.state["geojson"];
        var mapContent = d3
            .select("#main-pane g.map")
            .selectAll("path")
            .data(geojson.features);

        // Scale and center the map.
        const svgContainer = document.getElementById("map_container");
        const projection = d3
            .geoAlbers()
            .fitSize([svgContainer.clientWidth,
                      svgContainer.clientHeight],
                      geojson);
        const geomap = d3.geoPath().projection(projection);

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

        this.setState({ mapContent });

        // Create population map.
        var popMap = {};
        for (const index in geojson.features) {
            var content = geojson.features[index];
            popMap[content.id] = content.properties.pop;
        }
        this.setState((state) => {
            return { popMap }
        });
    }

    /**
     * Updates geoJson map with current values loaded in state.
     * Requires geoJson map to be rendered and state values to be set.
     */
    updateGeoValues() {
        const values = this.state["values"];
        const isPerCapita = this.state["pc"];

        // Build chart display options.
        const colorScale = d3
            .scaleLinear()
            .domain(determineColorPalette(values,
                this.state["pc"], this.state["popMap"]))
            .range(["#deebf7", "#9ecae1", "#3182bd"] as any);

        // Select D3 paths via geojson data.
        const geojson = this.state["geojson"];
        const mapContent = d3
            .select("#main-pane g.map")
            .selectAll("path")
            .data(geojson.features);
        
        // Create new infill.
        mapContent
            .attr("fill", function 
                    (d : { properties: { geoDcid : string, pop : number }}) {
                if (d.properties.geoDcid in values) {
                    const value = values[d.properties.geoDcid];
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
            });
    }

    /**
     * Capture hover event on geo and displays relevant information.
     * @param {json} geo is the geoJson content for the hovered geo.
     */
    handleMapHover(geo) {
        // Display statistical variable information on hover.
        const name = geo.properties.name;
        const geoDcid = geo.properties.geoDcid;
        const values = this.state["values"];
        let geoValue : any = "No Value";
        if (geoDcid in values) {
            geoValue = values[geoDcid];
            if (this.state["pc"]) {
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

    /**
     * Updates the current map and URL to a new statistical variable without
     * a full page refresh.
     * @param statVar to update to.
     */
    handleStatVarChange(statVar) {
        let baseUrl = "/tools/choropleth";
        baseUrl += buildChoroplethParams(
            ["geoDcid", "bc", "pc", "level", "mdom"]);
        baseUrl += "&statVar=" + statVar;
        history.pushState({}, null, baseUrl);
        // TODO(iancostello): Manage through component's state. 
        this.loadValues();
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
            redirectToGeo(geo.properties.geoDcid);
        } else {
            //TODO(iancostello): Improve this feature (change cursor)
            alert("This geo has no further sublevels!");
        }
    }

    render() {
        // TODO(iancostello): capture size from parent.
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
 * @param fieldsToInclude from URL.
 * @param reqPoint baseUrl to hit in choropleth sphere.
 */
function buildChoroplethUrl(fieldsToInclude, reqPoint) {
    //TODO(iancostello): Make this path relative.
    var baseUrl = document.location.origin + document.location.pathname;
    baseUrl += reqPoint;
    baseUrl += "?";
    const urlParams = new URLSearchParams(window.location.search);
    for (let index in fieldsToInclude) {
      let argName = fieldsToInclude[index];
      let argValue = urlParams.get(argName);
      if (argValue != null) {
        baseUrl += "&" + argName + "=" + argValue;
      }
    }
    return baseUrl;
}

/**
 * Redirects the webclient to a particular geo. Handles breadcrumbs in redirect.
 * @param {string} geoDcid to redirect to.
 */
function redirectToGeo(geoDcid) {
    var url = new URL(window.location.href);

    var baseUrl = "/tools/choropleth";
    baseUrl += buildChoroplethParams(
      ["statVar", "pc", "level", "mdom"]);
    baseUrl += "&geoDcid=" + geoDcid;
    baseUrl += "&bc=";
  
    // Add or create breadcrumbs field.
    // TODO(iancostello): Use parent places api.
    var breadcrumbs = url.searchParams.get("bc");
    if (breadcrumbs != null && breadcrumbs !== "") {
      baseUrl += breadcrumbs + ";";
    }
    baseUrl += url.searchParams.get("geoDcid");
    window.location.href = baseUrl;
}
  
/**
 * Generates the breadcrumbs text from browser url.
 */
function generateBreadCrumbs() {
    var url = new URL(window.location.href);

    var breadcrumbs = url.searchParams.get("bc");
    if (breadcrumbs != null && breadcrumbs !== "") {
        var breadcrumbsDisplay = document.getElementById("breadcrumbs");
        var crumbs = breadcrumbs.split(";");

        // Build url for each reference in the breadcrumbs.
        var baseUrl = "/tools/choropleth";
        baseUrl += buildChoroplethParams(
        ["statVar", "pc", "level", "mdom"]);
        baseUrl += "&geoDcid=";

        var breadcrumbsUpto = "";
        for (let index in crumbs) {
            let levelRef = crumbs[index];

            if (levelRef !== "") {
                // TODO(iancostello): Turn into react component to sanitize.
                let currUrl = baseUrl + levelRef + "&bc=" + breadcrumbsUpto;
                breadcrumbsDisplay.innerHTML +=
                '<a href="' + currUrl + '">' + levelRef + "</a>" + " > ";
                breadcrumbsUpto += levelRef + ";";
            }
        }
        breadcrumbsDisplay.innerHTML += url.searchParams.get("geoDcid");
    }
}

/**
 * Returns domain of color palette as len 3 numerical array for plotting. 
 * @param dict of values mapping geoDcid to number returned by /values endpoint.
 * @param pc boolean if plotting pc.
 * @param popMap json object mapping geoDcid to total population.
 */
function determineColorPalette(dict, pc, popMap) {
    // Create a sorted list of values.
    var values = [];
    for (let key in dict) {
        if (pc) {
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