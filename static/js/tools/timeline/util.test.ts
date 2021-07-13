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
  getPlaceNames,
  getTokensFromUrl,
  setTokensToUrl,
  addToken,
  removeToken,
} from "./util";

test("get place names", () => {
  const dcids = ["geoId/4459000", "country/USA"];
  const placesPromise = getPlaceNames(dcids);
  placesPromise.then((places) => {
    expect(places).toStrictEqual({
      "geoId/4459000": "Providence",
      "country/USA": "United States",
    });
  });
});

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
  setTokensToUrl({
    place: { sep: ",", tokens: new Set(["country/USA", "geoId/06"]) },
  });
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
