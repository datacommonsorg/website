/**
 * Copyright 2024 Google LLC
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
import { TEXT_FONT_FAMILY } from "../../js/chart/draw_constants";
import { FONT_FAMILY } from "../constants";
import { ChartProps } from "../types";
import {
  compressChartProps,
  decompressChartProps,
  getProcessedSvg,
} from "./utils";

const TEST_PLACE = "testPlace";
const TEST_PLACE_TYPE = "placeType";
const TEST_SV_SPEC = [
  {
    denom: "denom1",
    log: false,
    name: "sv1",
    scaling: 1,
    statVar: "svDcid1",
    unit: "",
  },
  {
    denom: "denom2",
    log: false,
    name: "sv2",
    scaling: 1,
    statVar: "svDcid2",
    unit: "",
  },
];
const TEST_CONFIG = {
  barTileSpec: { maxPlaces: 15, sort: "DESCENDING" },
  description: "",
  statVarKey: [],
  type: "BAR",
};
const TEST_EVENT_TYPE_SPEC = {
  testSpec: {
    color: "blue",
    defaultSeverityFilter: {
      lowerLimit: 100,
      prop: "area",
      unit: "m2",
      upperLimit: 1000,
    },
    displayProp: [],
    endDateProp: [],
    eventTypeDcids: ["stormDcid"],
    id: "testSpec",
    name: "testSpecName",
  },
};

test("compress and decompress chart props", () => {
  const cases: ChartProps[] = [
    {
      enclosedPlaceType: TEST_PLACE_TYPE,
      eventTypeSpec: TEST_EVENT_TYPE_SPEC,
      place: TEST_PLACE,
      statVarSpec: TEST_SV_SPEC,
      tileConfig: TEST_CONFIG,
    },
  ];

  for (const c of cases) {
    const compressedChartProp = compressChartProps(c);
    const decompressedChartProp = decompressChartProps(compressedChartProp);
    try {
      expect(decompressedChartProp).toEqual(c);
    } catch (e) {
      console.log(`Failed for case with chartProp: ${c}`);
      throw e;
    }
  }
});

test("getProcessedSvg strips inline font-family and sets server font", () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "200");
  svg.setAttribute("height", "100");
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.style.fontFamily = TEXT_FONT_FAMILY;
  text.style.fill = "#2b2929";
  text.textContent = "Label";
  svg.appendChild(text);

  const processed = getProcessedSvg(svg);
  const processedText = processed.querySelector("text");
  expect(processedText.style.fontFamily).toBe("");
  expect(processedText.getAttribute("font-family")).toBe(FONT_FAMILY);
});
