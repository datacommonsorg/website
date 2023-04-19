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

import { ContextType, SHOW_POPULATION_LINEAR } from "./context";
import { applyHash, ScatterChartType, updateHash } from "./util";

const TestContext = {
  x: {
    value: {
      statVarDcid: "Count_Person",
      statVarInfo: null,
      log: true,
      perCapita: false,
      date: "",
      metahash: "",
      denom: "Count_Person",
    },
  },
  y: {
    value: {
      statVarDcid: "Count_HousingUnit",
      statVarInfo: null,
      log: false,
      perCapita: true,
      date: "",
      metahash: "",
      denom: "Count_Person",
    },
  },
  place: {
    value: {
      enclosingPlace: {
        name: "Delaware",
        dcid: "geoId/10",
        types: ["State"],
      },
      enclosedPlaceType: "County",
      enclosedPlaces: [
        {
          name: "a county",
          dcid: "geoId/10003",
        },
        {
          name: "another county",
          dcid: "geoId/10005",
        },
      ],
      parentPlaces: null,
      lowerBound: 0,
      upperBound: 99999,
    },
  },
  display: {
    showQuadrants: true,
    showLabels: true,
    showDensity: true,
    chartType: ScatterChartType.SCATTER,
    showRegression: true,
    showPopulation: SHOW_POPULATION_LINEAR,
  },
} as unknown as ContextType;
const Hash =
  "#%26svx%3DCount_Person%26lx%3D1%26dx%3DCount_Person%26svy%3DCount_HousingUnit%26pcy%3D1%26dy%3DCount_Person%26epd%3DgeoId%2F10%26ept%3DCounty%26ub%3D99999%26qd%3D1%26ld%3D1%26dd%3D1%26rg%3D1%26pp%3Dlinear";

test("updateHash", () => {
  history.pushState = jest.fn();
  updateHash(TestContext);
  expect(history.pushState).toHaveBeenCalledWith(
    {},
    "",
    `/tools/scatter${Hash}`
  );
});

test("applyHash", () => {
  const context = { x: {}, y: {}, place: {}, display: {} } as ContextType;
  context.x.set = (value) => (context.x.value = value);
  context.y.set = (value) => (context.y.value = value);
  context.place.set = (value) => (context.place.value = value);
  context.display.setQuadrants = (value) =>
    (context.display.showQuadrants = value);
  context.display.setLabels = (value) => (context.display.showLabels = value);
  context.display.setChartType = (value) => (context.display.chartType = value);
  context.display.setDensity = (value) => (context.display.showDensity = value);
  context.display.setRegression = (value) =>
    (context.display.showRegression = value);
  context.display.setPopulation = (value) =>
    (context.display.showPopulation = value);
  location.hash = Hash;
  applyHash(context);
  expect(context.x.value).toEqual(TestContext.x.value);
  expect(context.y.value).toEqual(TestContext.y.value);
  expect(context.place.value).toEqual({
    ...TestContext.place.value,
    enclosedPlaces: null,
    enclosingPlace: {
      dcid: "geoId/10",
      name: "",
      types: null,
    },
  });
  expect(context.display.showQuadrants).toEqual(
    TestContext.display.showQuadrants
  );
  expect(context.display.showDensity).toEqual(TestContext.display.showDensity);
  expect(context.display.showRegression).toEqual(
    TestContext.display.showRegression
  );
  expect(context.display.showPopulation).toEqual(
    TestContext.display.showPopulation
  );
});
