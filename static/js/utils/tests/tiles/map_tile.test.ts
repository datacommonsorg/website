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

import {
  getWebComponentSourceCode,
  MapChartData,
  MapLayerData,
  MapTilePropType,
} from "../../../components/tiles/map_tile";
import { NamedTypedPlace, StatVarSpec } from "../../../shared/types";

const testPlace: NamedTypedPlace = {
  dcid: "geoId/06",
  name: "California",
  types: ["State"],
};

const testStatVar: StatVarSpec = {
  statVar: "Count_Person",
  date: "2020",
};

const layer1: MapLayerData = {
  geoJson: {},

};

const testPropsSimple: MapTilePropType = {
  enclosedPlaceType: "County",
  footnote: "Test Footnote",
  id: "test-map-tile",
  place: testPlace,
  statVarSpec: testStatVar,
  svgChartHeight: 200,
  title: "Test Map Tile",
};

const testSingleLayerChartData: MapChartData = {
  dateRange: "",
  errorMsg: "",
  isUsaPlace: true,
  layerData: [layer1],
  props: testPropsSimple,
  sources: new Set<string>(),
};

test("getWebComponentSourceCode", () => {
  const cases: {
    mapChartData: MapChartData;
    expected: string;
  }[] = [
    {
      mapChartData: testSingleLayerChartData,
      expected: "",
    },
  ];

  for (const c of cases) {
    const sourceCode = getWebComponentSourceCode(c.mapChartData);
    try {
      expect(sourceCode).toEqual(c.expected);
    } catch (e) {
      console.log(`Failed for case with data: ${c.mapChartData}`);
      throw e;
    }
  }
});
