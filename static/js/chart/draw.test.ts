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

import {
  DataPoint,
} from "./base";

import {
  appendLegendElem,
  getColorFn,
} from "./draw";

test("svg test", () => {
  let dataPoints = [
    new DataPoint("bar1", 10),
    new DataPoint("bar2", 20),
    new DataPoint("bar3", 30),
    new DataPoint("bar4", 40),
    new DataPoint("bar5", 50),
  ];
  document.body.innerHTML = '<div id="chart"></div>';
  let keys = ["San Jose", "Palo Alto"];
  let color = getColorFn(keys);
  appendLegendElem("chart", color, keys);

  expect(document.getElementById("chart").innerHTML).toEqual(
    `<div class="legend">` +
    `<div style="background: #930000"><span>San Jose</span></div>` +
    `<div style="background: #3288bd"><span>Palo Alto</span></div>` +
    `</div>`
  );
});