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

import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { MainPane } from "./choropleth_template";

const d3 = require("d3");
var url = new URL(window.location.href);

/**
 * Generates choropleth map from API on pageload.
 */
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    ReactDOM.render(
        React.createElement(MainPane),
        document.getElementById("main-pane")
    );

    // Build api call from request.
    var base_url = "choropleth/download?";
    base_url += "statVar=" + urlParams.get("statVar");
    base_url += "&perCapita=" + (urlParams.get("perCapita") == "true");
    base_url += "&place=" + urlParams.get("place");

    // Create request and generate map.
    axios.get(base_url).then((resp) => {
        var payload = resp.data[0];
        generateGeoMap(payload['geoJson'], payload['_PLOTTING_INFO'])
    });

    // Generate breadcrumbs.
    generateBreadCrumbs()
};

/**
 * Handles the creation of d3 map from geojson file.
 * @param {json} geojson entire geoJson map.
 */
function generateGeoMap(geojson, plt_info) {
    // Combine path elements from D3 content.
    var mapContent = d3.select("#main-pane g.map")
        .selectAll("path")
        .data(geojson.features);

    // Build chart display options.
    var colorScale = d3.scaleLinear()
      .domain(plt_info['domain'])
      .range(plt_info['palette']);    

    // Scale and center the map.
    var svg_container = document.getElementById("map_container")
    var projection = d3.geoAlbers().fitSize([
        svg_container.clientWidth,
        svg_container.clientHeight],
        geojson);
    var geomap = d3.geoPath().projection(projection);

    // Build map objects.
    mapContent.enter()
        .append("path")
        .attr("d", geomap)
        // Add CSS class to each path for border outlining.
        .attr("class", "border")
        .attr("fill", function (d) {
            if (d.properties.hasOwnProperty('value')) {
                return colorScale(d.properties.value)
            } else {
                return "gray";
            }
          })
        // Add various country level event handlers.
        .on("mouseover", handleMapHover)
        .on("mouseleave", mouseLeave)
        .on("click", handleMapClick);
}

/**
 * Capture hover event on country and displays relevant information.
 * @param {json} country is the geoJson content for the hovered country.
 */
function handleMapHover(country) {
    // Display statistical variable information on hover.
    let name = country.properties.name;
    if (country.properties.hasOwnProperty('value')) {
        document.getElementById("display").innerHTML = name + " - " +
            country.properties.value;
    } else {
        document.getElementById("display").innerHTML = name + " - No Value";
    }
    
    // Highlight selected country in black on hover.
    d3.select(this).style("stroke", "black");
  }
  
  /**
   * Clears output after leaving a country.
   */
  function mouseLeave() {
    // Remove hover text.
    document.getElementById("display").innerHTML = "";
  
    // Remove country display effect.
    d3.select(this).style("stroke", "white");
  }
  
  /**
   * Capture click event on country and redirects
   * user to that page in the browser.
   * @param {json} country is the geoJson content for the clicked country.
   */
  function handleMapClick(geo) {
    if (geo.properties.hasSublevel) {
      redirectToGeo(geo.properties.geoId)
    } else {
      alert("This geo has no further sublevels!")
    }
  }

  function redirectToGeo(geoId) {
    var base_url = document.location.origin + document.location.pathname + '?'
    base_url += "statVar=" + url.searchParams.get("statVar");
    base_url += "&perCapita=" + url.searchParams.get("perCapita")
    base_url += "&place=" + geoId
    base_url += "&bc=" 
    
    // Handle breadcrumbs
    var breadcrumbs = url.searchParams.get("bc");
    if (breadcrumbs != null && breadcrumbs != "") {
      base_url += breadcrumbs + ";"
    }
    base_url += url.searchParams.get("place");
    window.location.href = base_url
  }

  function generateBreadCrumbs() {
    var breadcrumbs = url.searchParams.get("bc");
    var crumbs = breadcrumbs.split(";")
  
    // Retain existing settings
    var base_url = document.location.origin + document.location.pathname + '?'
    base_url += "statVar=" + url.searchParams.get("statVar");
    base_url += "&perCapita=" + url.searchParams.get("perCapita")

    // Change level
    base_url += "&place=";
    var breadcrumbs_upto = "";
  
    var breadcrumbs_display = document.getElementById("breadcrumbs");
    for (let index in crumbs) {
      let level_ref = crumbs[index];
  
      if (level_ref != "") {
        // TODO how should we sanitize this?
        let curr_url = base_url + level_ref + "&bc=" + breadcrumbs_upto;
        breadcrumbs_display.innerHTML += 
          "<a href=\"" + curr_url + "\">" + level_ref +  "</a>" + " > ";
        breadcrumbs_upto += level_ref + ";";
      } 
    }
    breadcrumbs_display.innerHTML += url.searchParams.get("place")
  }