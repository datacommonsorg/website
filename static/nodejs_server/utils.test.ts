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
import { ChartProps } from "./types";
import { compressChartProps, decompressChartProps } from "./utils";

const TEST_PLACE = "testPlace";
const TEST_PLACE_TYPE = "placeType";
const TEST_SV_SPEC = [
  {
    name: "sv1",
    statVar: "svDcid1",
    denom: "denom1",
    unit: "",
    scaling: 1,
    log: false,
  },
  {
    name: "sv2",
    statVar: "svDcid2",
    denom: "denom2",
    unit: "",
    scaling: 1,
    log: false,
  },
];
const TEST_CONFIG = {
  type: "BAR",
  barTileSpec: { maxPlaces: 15, sort: "DESCENDING" },
  description: "",
  statVarKey: [],
};
const TEST_EVENT_TYPE_SPEC = {
  testSpec: {
    id: "testSpec",
    name: "testSpecName",
    eventTypeDcids: ["stormDcid"],
    color: "blue",
    defaultSeverityFilter: {
      prop: "area",
      unit: "m2",
      upperLimit: 1000,
      lowerLimit: 100,
    },
    displayProp: [],
    endDateProp: [],
  },
};

test("compress and decompress chart props", () => {
  const cases: ChartProps[] = [
    {
      tileConfig: TEST_CONFIG,
      eventTypeSpec: TEST_EVENT_TYPE_SPEC,
      place: TEST_PLACE,
      statVarSpec: TEST_SV_SPEC,
      enclosedPlaceType: TEST_PLACE_TYPE,
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
