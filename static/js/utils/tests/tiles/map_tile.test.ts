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
  denom: "",
  log: false,
  scaling: 1,
  statVar: "Count_Person_WithHealthInsurance",
  unit: "",
};

const layer1: MapLayerData = {
  enclosedPlaceType: "County",
  geoJson: {
    type: "FeatureCollection",
    features: [],
    properties: { currentGeo: "" },
  },
  place: testPlace,
  variable: testStatVar,
};

const testPropsSimple: MapTilePropType = {
  enclosedPlaceType: "County",
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

const expectedSimpleSourceCode = `<script src="https://datacommons.org/datacommons.js"></script>
<datacommons-map
\theader="Test Map Tile"
\tchildPlaceTypes="County"
\tparentPlaces="geoId/06"
\tvariables="Count_Person_WithHealthInsurance"
></datacommons-map>`;

const testPlace2: NamedTypedPlace = {
  dcid: "geoId/10",
  name: "Delaware",
  types: ["State"],
};

const testStatVar2: StatVarSpec = {
  date: "2020",
  denom: "Count_Person",
  log: false,
  scaling: 1,
  statVar: "Count_Person_WithoutHealthInsurance",
  unit: "",
};

const layer2: MapLayerData = {
  enclosedPlaceType: "County",
  geoJson: {
    type: "FeatureCollection",
    features: [],
    properties: { currentGeo: "" },
  },
  place: testPlace2,
  variable: testStatVar,
};

const layer3: MapLayerData = {
  enclosedPlaceType: "County",
  geoJson: {
    type: "FeatureCollection",
    features: [],
    properties: { currentGeo: "" },
  },
  place: testPlace2,
  variable: testStatVar2,
};

const testPropsMultiLayer: MapTilePropType = {
  enclosedPlaceType: "County",
  footnote: "Test Footnote",
  id: "test-map-tile",
  parentPlaces: [testPlace, testPlace2],
  place: testPlace,
  statVarSpec: testStatVar,
  svgChartHeight: 200,
  title: "Test Map Tile",
};

const testMultiLayerChartData: MapChartData = {
  dateRange: "",
  errorMsg: "",
  isUsaPlace: true,
  layerData: [layer1, layer2, layer3],
  props: testPropsMultiLayer,
  sources: new Set<string>(),
};

const expectedMultiLayerSourceCode = `<script src="https://datacommons.org/datacommons.js"></script>
<datacommons-map
\theader="Test Map Tile"
\tchildPlaceTypes="County County County"
\tparentPlaces="geoId/06 geoId/10 geoId/10"
\tvariables="Count_Person_WithHealthInsurance Count_Person_WithoutHealthInsurance"
\tfootnote="Test Footnote"
\tperCapita="Count_Person_WithoutHealthInsurance"
></datacommons-map>`;

test("getWebComponentSourceCode", () => {
  const cases: {
    mapChartData: MapChartData;
    expected: string;
  }[] = [
    {
      mapChartData: testSingleLayerChartData,
      expected: expectedSimpleSourceCode,
    },
    {
      mapChartData: testMultiLayerChartData,
      expected: expectedMultiLayerSourceCode,
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
