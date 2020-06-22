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
 * @fileoverview dev page.
 */

import * as _SVG from "@svgdotjs/svg.js";

import {
  DataPoint,
  DataGroup,
} from "./chart/base";

import {
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
  drawLineChart,
} from "./chart/draw";

/**
 * Update translation results when schema mapping or query changes.
 */
window.onload = function () {
  let width = 350;
  let height = 400;

  // Container element to hold dom element of one chart.
  // The width and height is eventually obtained from gridding system like
  // Bootstrap.
  let containerId = "chart-box-1";
  let containerElem = document.getElementById(containerId);
  containerElem.style.width = width + "px";
  containerElem.style.height = height + "px";

  // Draw single bar chart.
  let dataPoints = [
    new DataPoint("San Jose", 7021342),
    new DataPoint("Santa Clara County", 1002342),
    new DataPoint("California", 300234),
    new DataPoint("United States", 2520234),
  ];
  drawSingleBarChart(containerId, width, height, dataPoints);

  let dataGroups = [
    new DataGroup(
      "San Jose",
      [
        new DataPoint("2011", 21000),
        new DataPoint("2012", 22000),
        new DataPoint("2013", 23000),
      ]
    ),
    new DataGroup(
      "Fremont",
      [
        new DataPoint("2011", 22000),
        new DataPoint("2012", 26000),
        new DataPoint("2013", 24000),
      ]
    ),
    new DataGroup(
      "San Francisco",
      [
        new DataPoint("2011", 21000),
        new DataPoint("2012", 25000),
        new DataPoint("2013", 22000),
      ]
    )
  ];

  // Draw stack bar chart.
  containerId = "chart-box-2";
  containerElem = document.getElementById(containerId);
  containerElem.style.width = width + "px";
  drawStackBarChart(containerId, width, height, dataGroups);

  // Draw group bar chart.
  containerId = "chart-box-3";
  containerElem = document.getElementById(containerId);
  containerElem.style.width = width + "px";
  drawGroupBarChart(containerId, width, height, dataGroups);

  // Draw line chart.
  containerId = "chart-box-4";
  containerElem = document.getElementById(containerId);
  containerElem.style.width = width + "px";
  drawLineChart(containerId, width, height, dataGroups);
};
