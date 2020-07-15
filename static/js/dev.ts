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

import { DataPoint, DataGroup } from "./chart/base";

import {
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
  drawLineChart,
  drawGroupLineChart,
} from "./chart/draw";

window.onload = () => {
  let width = 350;
  const height = 300;

  // Container element to hold dom element of one chart.
  // The width and height is eventually obtained from gridding system like
  // Bootstrap.

  let id = 0;
  const containerElem = document.getElementById("charts-container");
  function addChartContainer(w:number , h:number) {
    const cid = "chart-box-" + ++id;
    const chartElem = containerElem.appendChild(document.createElement("div"));
    chartElem.className = "chart";
    chartElem.id = cid;
    chartElem.style.width = width + "px";
    return cid;
  }

  // Draw single bar chart.
  let dataPoints = [
    new DataPoint("San Jose", 702134),
    new DataPoint("Santa Clara County", 1002342),
    new DataPoint("California", 3002342),
    new DataPoint("United States", 9520234),
  ];
  let containerId = addChartContainer(width, height);
  drawSingleBarChart(containerId, width, height, dataPoints);

  let dataGroups = [
    new DataGroup("San Jose", [
      new DataPoint("2011", 21000),
      new DataPoint("2012", 22000),
      new DataPoint("2013", 23000),
    ]),
    new DataGroup("Fremont", [
      new DataPoint("2011", 22000),
      new DataPoint("2012", 26000),
      new DataPoint("2013", 24000),
    ]),
    new DataGroup("San Francisco", [
      new DataPoint("2011", 21000),
      new DataPoint("2012", 25000),
      new DataPoint("2013", 22000),
    ]),
    new DataGroup("Mountain View", [
      new DataPoint("2011", 1000),
      new DataPoint("2012", 5000),
      new DataPoint("2013", 2000),
    ]),
    new DataGroup("VeryLongCityName", [
      new DataPoint("2011", 1000),
      new DataPoint("2012", 5000),
      new DataPoint("2013", 2000),
    ]),
  ];

  // Draw stack bar chart.
  containerId = addChartContainer(width, height);
  drawStackBarChart(containerId, width, height, dataGroups);

  // Draw group bar chart.
  containerId = addChartContainer(width, height);
  drawGroupBarChart(containerId, width, height, dataGroups);

  // Draw line chart.
  containerId = addChartContainer(width, height);
  drawLineChart(containerId, width, height, dataGroups);

  // Draw single bar chart with dollar values
  containerId = addChartContainer(width, height);
  drawSingleBarChart(containerId, width, height, dataPoints, "$");

  // Draw single bar chart with percentage values
  width = 225;
  dataPoints = [
    new DataPoint("San Jose", 70.2),
    new DataPoint("Santa Clara County", 12.4),
    new DataPoint("California", 30),
    new DataPoint("United States", 95.9),
  ];
  containerId = addChartContainer(width, height);
  drawSingleBarChart(containerId, width, height, dataPoints, "%");

  // Draw narrow single bar chart with potentially weird y-axis values
  width = 315;
  dataPoints = [
    new DataPoint("Enrolled in School", 510475),
    new DataPoint("Not Enrolled in School", 1341885),
  ];
  containerId = addChartContainer(width, height);
  drawSingleBarChart(containerId, width, height, dataPoints);

  // Test percent and narrow chart
  dataPoints = [
    new DataPoint("San Jose", 20.2),
    new DataPoint("Santa Clara County", 22.4),
    new DataPoint("California", 23),
    new DataPoint("United States", 25.9),
  ];
  containerId = addChartContainer(width, height);
  drawSingleBarChart(containerId, width, height, dataPoints, "%");

  // Test narrow group bar chart
  containerId = addChartContainer(width, height);
  drawGroupBarChart(containerId, width, height, dataGroups);

  // Test narrow line chart
  dataGroups = [
    new DataGroup("label-1", [
      new DataPoint("01-01-2011", 702134),
      new DataPoint("01-02-2011", 1002342),
      new DataPoint("01-03-2011", 3002342),
      new DataPoint("01-04-2011", 9520234),
      new DataPoint("01-05-2011", 3520234),
      new DataPoint("01-06-2011", 7520234),
    ]),
  ];
  containerId = addChartContainer(width, height);
  drawLineChart(containerId, width, height, dataGroups);

  // Test y-axis with small values
  dataGroups = [
    new DataGroup("label-1", [
      new DataPoint("01-01-2011", 7),
      new DataPoint("01-02-2011", 10),
    ]),
  ];
  containerId = addChartContainer(width, height);
  drawLineChart(containerId, width, height, dataGroups);

  // Test group line chart
  const dataGroupsGeo11 = new DataGroup("Total", [
    new DataPoint("2011", 2940667),
    new DataPoint("2012", 2952164),
    new DataPoint("2013", 2959400),
    new DataPoint("2014", 2967392),
    new DataPoint("2015", 2978048),
    new DataPoint("2016", 2989918),
    new DataPoint("2017", 3001345),
    new DataPoint("2018", 3009733),
  ]);

  const dataGroupsGeo12 = new DataGroup("Male", [
    new DataPoint("2011", 1421287),
    new DataPoint("2012", 1431252),
    new DataPoint("2013", 1439862),
    new DataPoint("2014", 1447235),
    new DataPoint("2015", 1451913),
    new DataPoint("2016", 1456694),
    new DataPoint("2017", 1461651),
    new DataPoint("2018", 1468412),
  ]);

  const dataGroupsGeo21 = new DataGroup("Total", [
    new DataPoint("2011", 37638369),
    new DataPoint("2012", 37948800),
    new DataPoint("2013", 38260787),
    new DataPoint("2014", 38596972),
    new DataPoint("2015", 38918045),
    new DataPoint("2016", 39167117),
    new DataPoint("2017", 39358497),
    new DataPoint("2018", 39461588),
  ]);

  const dataGroupsGeo22 = new DataGroup("Male", [
    new DataPoint("2011", 18387718),
    new DataPoint("2012", 18561020),
    new DataPoint("2013", 18726468),
    new DataPoint("2014", 18911519),
    new DataPoint("2015", 19087135),
    new DataPoint("2016", 19200970),
    new DataPoint("2017", 19366579),
    new DataPoint("2018", 19453769),
  ]);

  const dataGroupsDict1 = {
    "geoId/05": [dataGroupsGeo11, dataGroupsGeo12],
    "geoId/06": [dataGroupsGeo21, dataGroupsGeo22],
  };
  containerId = addChartContainer(1000, 500);
  drawGroupLineChart(containerId, 1000, 500, dataGroupsDict1);

  const dataGroupsDict2 = {
    "geoId/06": [dataGroupsGeo21, dataGroupsGeo22],
  };

  containerId = addChartContainer(1000, 500);
  drawGroupLineChart(containerId, 1000, 500, dataGroupsDict2);

  const dataGroupsDict3 = {
    "geoId/05": [dataGroupsGeo11],
    "geoId/06": [dataGroupsGeo21],
  };

  containerId = addChartContainer(1000, 500);
  drawGroupLineChart(containerId, 1000, 500, dataGroupsDict3);

  const dataGroupsDict = {};
  for (let i = 1; i <= 10; i++) {
    dataGroupsDict[i] = [
      new DataGroup("Test", [
        new DataPoint("1", i),
        new DataPoint("2", i),
        new DataPoint("3", i),
        new DataPoint("4", i),
        new DataPoint("5", i),
        new DataPoint("6", i),
      ]),
    ];
  }
  containerId = addChartContainer(1000, 500);
  drawGroupLineChart(containerId, 1000, 500, dataGroupsDict);
};
