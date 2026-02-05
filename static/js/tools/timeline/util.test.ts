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
  addToken,
  getChartOption,
  getTokensFromUrl,
  removeToken,
  setChartOption,
  setTokensToUrl,
} from "./util";

test("test getTokensFromUrl", () => {
  window.location.hash =
    "#&place=country/USA,geoId/06&statsVar=Count_Person__Median_Age_Person";
  // places
  let tokens = getTokensFromUrl("place", ",");
  expect(tokens).toContain("country/USA");
  expect(tokens).toContain("geoId/06");
  // stat vars
  tokens = getTokensFromUrl("statsVar", "__");
  expect(tokens).toContain("Count_Person");
  expect(tokens).toContain("Median_Age_Person");
});

test("test setTokensToUrl", () => {
  window.location.hash = "#&statsVar=Count_Person__Median_Age_Person";
  // places
  setTokensToUrl([
    { name: "place", sep: ",", tokens: new Set(["country/USA", "geoId/06"]) },
  ]);
  expect(window.location.hash).toBe(
    "#statsVar=Count_Person__Median_Age_Person&place=country%2FUSA%2CgeoId%2F06"
  );
});

test("test addToken", () => {
  window.location.hash = "#&statsVar=Count_Person__Median_Age_Person";
  // existing token
  addToken("statsVar", "__", "Median_Age_Person");
  expect(window.location.hash).toBe(
    "#&statsVar=Count_Person__Median_Age_Person"
  );
  // new token
  addToken("statsVar", "__", "Count_Person_Female");
  expect(window.location.hash).toBe(
    "#statsVar=Count_Person__Median_Age_Person__Count_Person_Female"
  );
});

test("test removeToken", () => {
  window.location.hash = "#&statsVar=Count_Person__Median_Age_Person";
  // places
  removeToken("statsVar", "__", "Count_Person");
  expect(window.location.hash).toBe("#statsVar=Median_Age_Person");
});

test("get chart option", () => {
  // New url format
  window.location.hash = `#statsVar=Count_Household&place=country%2FUSA&pc`;
  expect(getChartOption("count", "pc")).toEqual(true);

  window.location.hash = `#statsVar=Count_Household&place=country%2FUSA&chart=%7B"count"%3A%7B"pc"%3Atrue%7D%7D`;
  expect(getChartOption("count", "pc")).toEqual(true);

  window.location.hash = `#statsVar=Count_Household__Median_Age_Person&place=country%2FUSA&chart=%7B"count"%3A%7B"pc"%3Atrue%7D%2C"age"%3A%7B"delta"%3Atrue%7D%7D`;
  expect(getChartOption("count", "pc")).toEqual(true);
  expect(getChartOption("age", "pc")).toEqual(false);

  // Old url format with only pc set
  window.location.hash = `place=country%2FUSA&statsVar=Count_CriminalActivities_CombinedCrime&chart=%7B"count"%3Atrue%7D`;
  expect(getChartOption("count", "pc")).toEqual(true);
});

test("set chart option", () => {
  // New url format
  window.location.hash = `#statsVar=Count_Household&place=country%2FUSA`;
  setChartOption("count", "pc", true);
  expect(getChartOption("count", "pc")).toEqual(true);
  setChartOption("count", "pc", false);
  expect(getChartOption("count", "pc")).toEqual(false);

  // Old url format with only pc set
  window.location.hash = `place=country%2FUSA&statsVar=Count_CriminalActivities_CombinedCrime&chart=%7B"count"%3Atrue%7D`;
  setChartOption("count", "pc", false);
  expect(getChartOption("count", "pc")).toEqual(false);
  setChartOption("count", "pc", true);
  expect(getChartOption("count", "pc")).toEqual(true);
});
