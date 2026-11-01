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

import * as d3 from "d3";

import { getColorFn, getDashes } from "./base";
import { TEXT_FONT_FAMILY } from "./draw_constants";
import { addXAxis, addYAxis, appendLegendElem } from "./draw_utils";

beforeAll(() => {
  (SVGElement.prototype as any).getComputedTextLength = (): number => 50;
  (SVGElement.prototype as any).getBBox = (): {
    x: number;
    y: number;
    width: number;
    height: number;
  } => ({ x: 0, y: 0, width: 50, height: 12 });
});

test("svg test", () => {
  const rootEl = document.createElement("div");
  rootEl.setAttribute("id", "chart");
  document.body.append(rootEl);
  const data = [
    { label: "San Jose", link: "about:blank" },
    { label: "Palo Alto", link: "/foo/bar" },
  ];
  const keys = data.map((d) => d.label);
  const color = getColorFn(keys);
  appendLegendElem(rootEl, color, data);

  expect(rootEl.innerHTML).toEqual(
    '<div part="legend" class="legend-basic">' +
      '<div class="legend-item">' +
      '<div class="legend-color" part="legend-color legend-color-San Jose" style="background: rgb(147, 0, 0)"></div>' +
      '<a class="legend-link" title="San Jose" href="about:blank">San Jose</a>' +
      "</div>" +
      '<div class="legend-item">' +
      '<div class="legend-color" part="legend-color legend-color-Palo Alto" style="background: rgb(94, 79, 162)"></div>' +
      '<a class="legend-link" title="Palo Alto" href="/foo/bar">Palo Alto</a>' +
      "</div>" +
      "</div>"
  );
});

test("get dashes", () => {
  const data: { [key: number]: string[] } = {
    0: [],
    1: [""],
    2: ["", "5, 5"],
    3: ["", "5, 5", "3, 7"],
  };
  for (const n in data) {
    expect(getDashes(Number(n))).toEqual(data[n]);
  }
});

test("chart axis labels use CSS font family with sans-serif fallback", () => {
  expect(TEXT_FONT_FAMILY).toBe(
    "var(--dc-font-family, var(--font-family-sans-serif, sans-serif)), sans-serif"
  );
  expect(TEXT_FONT_FAMILY.toLowerCase()).not.toContain("roboto");

  const svg = d3.create("svg");
  document.body.append(svg.node());

  // Band x-axis (bar charts)
  const bandXAxis = svg.append("g");
  const bandScale = d3.scaleBand().domain(["A", "B"]).range([0, 200]);
  addXAxis(bandXAxis, 200, bandScale);
  bandXAxis.selectAll("text").each(function () {
    expect((this as SVGTextElement).style.fontFamily).toBe(TEXT_FONT_FAMILY);
  });

  // Time/linear x-axis (line charts)
  const timeXAxis = svg.append("g");
  const timeScale = d3
    .scaleTime()
    .domain([new Date(2020, 0, 1), new Date(2021, 0, 1)])
    .range([0, 200]);
  addXAxis(timeXAxis, 200, timeScale);
  timeXAxis.selectAll("text").each(function () {
    expect((this as SVGTextElement).style.fontFamily).toBe(TEXT_FONT_FAMILY);
  });

  // Y-axis ticks and long-unit axis label
  const yAxis = svg.append("g");
  const yScale = d3.scaleLinear().domain([0, 100]).range([200, 0]);
  addYAxis(yAxis, 300, yScale, undefined, "Metric Tons CO2e");
  const yAxisTexts = yAxis.selectAll("text").nodes() as SVGTextElement[];
  expect(yAxisTexts.length).toBeGreaterThan(1);
  for (const textNode of yAxisTexts) {
    expect(textNode.style.fontFamily).toBe(TEXT_FONT_FAMILY);
  }
});
