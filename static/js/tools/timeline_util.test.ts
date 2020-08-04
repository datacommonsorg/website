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

import { getPlaceNames, updateUrl, parseUrl, UrlTimeline } from "./timeline_util";

test("update Url statsvar", () => {
  window.location.hash = "";
  // add statsvar with path
  updateUrl({ statsVar: { statsVar: "dc/test1,0,0", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsVar=dc/test1,0,0");
  // add statsvar with name
  updateUrl({ statsVar: { statsVar: "dc/test2", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsVar=dc/test1,0,0__dc/test2");
  // add existing statsvar with name
  updateUrl({ statsVar: { statsVar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&statsVar=dc/test1,0,0__dc/test2");
  // delete statsvar with name
  updateUrl({ statsVar: { statsVar: "dc/test1", shouldAdd: false } });
  expect(window.location.hash).toBe("#&statsVar=dc/test2");
  // delete statsvar with path
  updateUrl({ statsVar: { statsVar: "dc/test2", shouldAdd: false } });
  expect(window.location.hash).toBe("");
  // delete statsvar not in list
  updateUrl({ statsVar: { statsVar: "dc/test2", shouldAdd: false } });
  expect(window.location.hash).toBe("");
  window.location.hash = "#&place=geoId/01";
  updateUrl({ statsVar: { statsVar: "dc/test1", shouldAdd: true } });
  expect(window.location.hash).toBe("#&place=geoId/01&statsVar=dc/test1");
});

test("parse statsVar from Url", () => {
  window.location.hash = "#&statsVar=Count_Person";
  expect(parseUrl().statsVarId).toStrictEqual(["Count_Person"]);
  expect(parseUrl().statsVarPath).toStrictEqual([[0, 0]]);
});

test("update places from Url", () => {
  window.location.hash = "#&place=geo/01";
  updateUrl({ place: { place: "geo/02", shouldAdd: true } });
  expect(window.location.hash).toBe(
    "#&place=geo/01,geo/02&statsVar=Count_Person"
  );
  updateUrl({ place: { place: "geo/02", shouldAdd: false } });
  expect(window.location.hash).toBe("#&place=geo/01&statsVar=Count_Person");
  updateUrl({ place: { place: "geo/01", shouldAdd: false } });
  expect(window.location.hash).toBe("#&statsVar=Count_Person");
});

test("parse places from Url", () => {
  window.location.hash = "#&place=geoId/4459000,country/USA";
  expect(parseUrl().placeId).toStrictEqual(["geoId/4459000", "country/USA"]);
});

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


test("test UrlTimeline", () => {
  let urltest = new UrlTimeline();
  urltest.addPlace("country/USA");
  expect(urltest.placeDcids).toStrictEqual(["country/USA"])
  urltest.addStatsVar("Count_Person")
  expect(urltest.statsVarNodes).toStrictEqual({ Count_Person: [] });
  urltest.addStatsVarWithPath("Median_Age_Person", ["0", "1"]);
  expect(urltest.statsVarNodes).toStrictEqual({ Count_Person: [], Median_Age_Person: [["0", "1"]] });
  urltest.removePLace("country/USA");
  expect(urltest.placeDcids).toStrictEqual([]);
  urltest.removeStatsVar("Count_Person");
  expect(urltest.statsVarNodes).toStrictEqual({ Median_Age_Person: [["0", "1"]] });
  urltest.removeStatsVarWithPath("Median_Age_Person", ["0", "1"]);
  expect(urltest.statsVarNodes).toStrictEqual({});
  // remove statsVar with name only, even though the path exists
  urltest.addStatsVarWithPath("Count_Person", ["0", "0"])
  expect(urltest.statsVarNodes).toStrictEqual({Count_Person: [["0","0"]]})
  urltest.removeStatsVar("Count_Person")
  expect(urltest.statsVarNodes).toStrictEqual({})
})