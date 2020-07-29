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
import * as d3 from "d3";

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

  // TODO:(iancostello) Refactor the url builder.
  // Build api call from request.
  var base_url = build_choropleth_url(
    ["statVar", "perCapita", "geoId", "level", "mdom"],
    true
  );
  // Create request and generate map.
  axios.get(base_url).then((resp) => {
    var payload = resp.data[0];
    generateGeoMap(payload["geoJson"], payload["_PLOTTING_INFO"]);
  });

  // Generate breadcrumbs.
  generateBreadCrumbs();
};

/**
 * Handles the creation of d3 map from geojson file.
 * @param {json} geojson entire geoJson map.
 * @param {json} plt_info plotting information for color scale.
 */
function generateGeoMap(geojson, plt_info) {
  // Combine path elements from D3 content.
  var mapContent = d3
    .select("#main-pane g.map")
    .selectAll("path")
    .data(geojson.features);

  // Build chart display options.
  var colorScale = d3
    .scaleLinear()
    .domain(plt_info["domain"])
    .range(plt_info["palette"]);

  // Scale and center the map.
  var svg_container = document.getElementById("map_container");
  var projection = d3
    .geoAlbers()
    .fitSize([svg_container.clientWidth, svg_container.clientHeight], geojson);
  var geomap = d3.geoPath().projection(projection);

  // Build map objects.
  mapContent
    .enter()
    .append("path")
    .attr("d", geomap)
    // Add CSS class to each path for border outlining.
    .attr("class", "border")
    .attr("fill", function (d) {
      if (d.properties.hasOwnProperty("value")) {
        return colorScale(d.properties.value);
      } else {
        return "gray";
      }
    })
    // Add various event handlers.
    .on("mouseover", handleMapHover)
    .on("mouseleave", mouseLeave)
    .on("click", handleMapClick);
}

/**
 * Capture hover event on geo and displays relevant information.
 * @param {json} geo is the geoJson content for the hovered geo.
 */
function handleMapHover(geo) {
  // Display statistical variable information on hover.
  let name = geo.properties.name;
  let geo_value = geo.properties.hasOwnProperty("value")
    ? geo.properties.value
    : "No Value";
  document.getElementById("hover-text-display").innerHTML =
    name + " - " + geo_value;

  // Highlight selected geo in black on hover.
  d3.select(this).attr("class", "border-highlighted");
}

/**
 * Clears output after leaving a geo.
 */
function mouseLeave() {
  // Remove hover text.
  document.getElementById("hover-text-display").innerHTML = "";

  // Remove geo display effect.
  d3.select(this).attr("class", "border");
}

/**
 * Capture click event on geo and zooms
 * user into that geo in the choropleth tool.
 * @param {json} geo is the geoJson content for the clicked geo.
 */
function handleMapClick(geo) {
  if (geo.properties.hasSublevel) {
    redirectToGeo(geo.properties.geoId);
  } else {
    //TODO(iancostello): Improve this feature (change cursor)
    alert("This geo has no further sublevels!");
  }
}

/**
 * Builds a redirect link given the fields to include from search params.
 * @param fields_to_include
 * @param from_api whether the url should be to the api or locally.
 */
function build_choropleth_url(fields_to_include, from_api) {
  //TODO(iancostello): Make this path relative.
  var base_url = document.location.origin + document.location.pathname;
  if (from_api) {
    base_url += "/api";
  }
  base_url += "?";
  const urlParams = new URLSearchParams(window.location.search);
  for (let index in fields_to_include) {
    let arg_name = fields_to_include[index];
    let arg_value = url.searchParams.get(arg_name);
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
  var base_url = build_choropleth_url(
    ["statVar", "perCapita", "level", "mdom"],
    false
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
  var breadcrumbs = url.searchParams.get("bc");
  if (breadcrumbs != null && breadcrumbs != "") {
    var breadcrumbs_display = document.getElementById("breadcrumbs");
    var crumbs = breadcrumbs.split(";");

    // Build url for each reference in the breadcrumbs.
    var base_url = build_choropleth_url(
      ["statVar", "perCapita", "level", "mdom"],
      false
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
