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

import {
  computePlotParams,
} from "./chart/base";

window.onload = () => {
  let width = 350;
  const height = 300;

  // Container element to hold dom element of one chart.
  // The width and height is eventually obtained from gridding system like
  // Bootstrap.

  let id = 0;
  let containerId: string;
  const containerElem = document.getElementById("charts-container");
  function addChartContainer(w: number, h: number) {
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
  containerId = addChartContainer(width, height);
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
    new DataGroup("Multi several very long city name long", [
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
  width = 500;
  const years = [
    "2011",
    "2012",
    "2013",
    "2014",
    "2015",
    "2016",
    "2017",
    "2018",
  ];
  const placeValue1 = {
    Total: [
      2940667,
      1952164,
      1959400,
      1967392,
      2978048,
      2989918,
      3001345,
      3009733,
    ],
    Male: [
      1421287,
      1431252,
      1439862,
      1447235,
      1451913,
      1456694,
      1461651,
      1468412,
    ],
  };
  const placeValue2 = {
    Total: [
      37638369,
      37948800,
      38260787,
      38596972,
      38918045,
      39167117,
      39358497,
      39461588,
    ],
    Male: [
      18387718,
      18561020,
      18726468,
      18911519,
      19087135,
      19200970,
      19366579,
      19453769,
    ],
  };
  const placeData1 = [];
  for (const label in placeValue1) {
    placeData1.push(
      new DataGroup(
        label,
        years.map((year, i) => new DataPoint(year, placeValue1[label][i]))
      )
    );
  }
  const placeData2 = [];
  for (const label in placeValue2) {
    placeData2.push(
      new DataGroup(
        label,
        years.map((year, i) => new DataPoint(year, placeValue2[label][i]))
      )
    );
  }

  const dataGroupsDict1: { [key: string]: DataGroup[] } = {
    "Nevada": placeData1,
    "California": placeData2,
  };

  containerId = addChartContainer(width, height);
  drawGroupLineChart(
    containerId,
    width,
    height,
    {"Total": "Total", "Male": "Male"},
    dataGroupsDict1,
    computePlotParams(["Nevada", "California"], ["Total", "Male"]),
  );

  const dataGroupsDict2: { [key: string]: DataGroup[] } = {
    "California": placeData2,
  };

  containerId = addChartContainer(width, height);
  drawGroupLineChart(
    containerId,
    width,
    height,
    {"Total": "Total", "Male": "Male"},
    dataGroupsDict2,
    computePlotParams(["California"], ["Total", "Male"]),
  );

  const dataGroupsDict3: { [key: string]: DataGroup[] } = {
    "very very very long place name": [placeData1[0]],
    "such a long name that it needs to span 4 lines": [placeData2[0]],
  };

  containerId = addChartContainer(width, height);
  drawGroupLineChart(
    containerId,
    width,
    height,
    {"Total": "Total"},
    dataGroupsDict3,
    computePlotParams(
      [
        "very very very long place name",
        "such a long name that it needs to span 4 lines",
      ],
      ["Total"]
    ),
  );
};
