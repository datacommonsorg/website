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

import * as _SVG from "@svgdotjs/svg.js";

import {
  DataPoint,
  Range,
  computeCoordinate,
} from "./base";

import {
  drawSingleBarChart,
} from "./draw";

/*
Object.defineProperty(SVGElement, "getComputedTextLength", {
  value: () => 10});

test("svg test", () => {
  let dataPoints = [
    new DataPoint("bar1", 10),
    new DataPoint("bar2", 20),
    new DataPoint("bar3", 30),
    new DataPoint("bar4", 40),
    new DataPoint("bar5", 50),
  ];
  document.body.innerHTML = '<div id="chart">' + "</div>";

  drawSingleBarChart(
    "chart", 400, 400,
    dataPoints,
  );
  expect(document.getElementById("chart").innerHTML).toMatch(
    /<svg xmlns.*svg>/
  );
});
*/

test("compute coordinate", () => {
  const vRange = new Range(7, 1);
  const cRange = new Range(10, 430);
  expect(computeCoordinate(2, vRange, cRange)).toBe(360);
});