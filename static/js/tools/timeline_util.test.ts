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

import { getPlaceNames, TimelineParams } from "./timeline_util";

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
  urltest.addStatsVar("Count_Person", ["0", "0"], []);
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: { paths: [["0", "0"]], denominators: [] }
  });

  // add duplicated statsVar
  urltest.addStatsVar("Count_Person", ["0", "0"], []);
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: { paths: [["0", "0"]], denominators: [] },
  });

  // add duplicated statsVar with different Path
  urltest.addStatsVar("Count_Person", ["0", "5"], []);
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: {
      paths: [
        ["0", "0"],
        ["0", "5"],
      ],
      denominators: [],
    },
  });

  // add one more statsVar
  urltest.addStatsVar("Median_Age_Person", ["0", "1"], []);
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: {
      paths: [
        ["0", "0"],
        ["0", "5"],
      ],
      denominators: [],
    },
    Median_Age_Person: { paths: [["0", "1"]], denominators: [] },
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
    Count_Person: { paths: [["0", "0"]], denominators: [] },
    Median_Age_Person: { paths: [["0", "1"]], denominators: [] },
  });

  // remove statsVar without Path
  urltest.removeStatsVar("Median_Age_Person");
  expect(urltest.statsVarNodes).toStrictEqual({
    Count_Person: { paths: [["0", "0"]], denominators: [] },
  });

  // remove statsVar with Path
  urltest.removeStatsVar("Count_Person", ["0", "0"]);
  expect(urltest.statsVarNodes).toStrictEqual({});
});

test("test function of parsing the timeline parameters from the url", () => {
  window.location.hash = "";
  const params = new TimelineParams();
  params.getParamsFromUrl();
  expect(params.chartOptions).toEqual({});
  expect(params.placeDcids).toStrictEqual([]);
  expect(params.statsVarNodes).toStrictEqual({});

  window.location.hash = "#&place=country/USA,geoId/06";
  params.getParamsFromUrl();
  expect(params.placeDcids).toStrictEqual(["country/USA", "geoId/06"]);

  window.location.hash =
    "&statsVar=Count_Person__Median_Age_Person,0,1__Unknown";
  params.getParamsFromUrl();
  expect(params.statsVarNodes).toStrictEqual({
    Count_Person: { paths: [["0", "0"]], denominators: [] },
    Median_Age_Person: { paths: [["0", "1"]], denominators: [] },
    Unknown: { paths: [[]], denominators: [] },
  });
});
