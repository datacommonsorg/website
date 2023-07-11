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

import { getColorFn, getDashes } from "./base";
import { appendLegendElem } from "./draw";

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
