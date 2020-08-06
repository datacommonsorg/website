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
  updateUrl,
  parseUrl,
  TimelineParams,
  getTimelineParamsFromUrl,
} from "./timeline_util";

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

// test the functions of updating the parameters in class TimelineParams
test("test TimelineParams", () => {
  const urltest = new TimelineParams();

  // add place
  urltest.addPlace("country/USA");
  expect(urltest.placeDcids).toStrictEqual(["country/USA"]);

  // add one statsVar
  urltest.addStatsVar("Count_Person", ["0", "0"]);
  expect(urltest.statsVarNodes).toStrictEqual({ Count_Person: [["0", "0"]] });

  // add duplicated statsVar
  urltest.addStatsVar("Count_Person", ["0", "0"]);
  expect(urltest.statsVarNodes).toStrictEqual({ Count_Person: [["0", "0"]] });

  // add duplicated statsVar with different Path
  urltest.addStatsVar("Count_Person", ["0", "5"]);
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: [
      ["0", "0"],
      ["0", "5"],
    ],
  });

  // add one more statsVar
  urltest.addStatsVar("Median_Age_Person", ["0", "1"]);
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: [
      ["0", "0"],
      ["0", "5"],
    ],
    Median_Age_Person: [["0", "1"]],
  });

  // get statsVarDcids
  expect(urltest.getStatsVarDcids()).toStrictEqual([
    "Count_Person",
    "Median_Age_Person",
  ]);

  // get statsVarPaths
  expect(urltest.getStatsVarPaths()).toStrictEqual([
    ["0", "0"],
    ["0", "5"],
    ["0", "1"],
  ]);

  // remove one place
  urltest.removePLace("country/USA");
  expect(urltest.placeDcids).toStrictEqual([]);

  // remove statsVar with one Path when there're multiple paths
  urltest.removeStatsVar("Count_Person", ["0", "5"]);
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: [["0", "0"]],
    Median_Age_Person: [["0", "1"]],
  });

  // remove statsVar without Path
  urltest.removeStatsVar("Median_Age_Person");
  expect(urltest.statsVarNodes).toStrictEqual({ Count_Person: [["0", "0"]] });

  // remove statsVar with Path
  urltest.removeStatsVar("Count_Person", ["0", "0"]);
  expect(urltest.statsVarNodes).toStrictEqual({});
});

test("test function of parsing the timeline parameters from the url", () => {
  window.location.hash = "";
  let params = getTimelineParamsFromUrl();
  expect(params.pc).toEqual(false);
  expect(params.placeDcids).toStrictEqual([]);
  expect(params.statsVarNodes).toStrictEqual({});

  window.location.hash = "#&place=country/USA,geoId/06";
  params = getTimelineParamsFromUrl();
  expect(params.placeDcids).toStrictEqual(["country/USA", "geoId/06"]);

  window.location.hash = "&pc=1";
  params = getTimelineParamsFromUrl();
  expect(params.pc).toEqual(true);

  window.location.hash =
    "&statsVar=Count_Person__Median_Age_Person,0,1__Unknown";
  params = getTimelineParamsFromUrl();
  expect(params.statsVarNodes).toStrictEqual({
    Count_Person: [["0", "0"]],
    Median_Age_Person: [["0", "1"]],
  });
});
