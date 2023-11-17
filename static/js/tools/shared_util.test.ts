/**
 * Copyright 2021 Google LLC
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
import { Observation } from "../shared/stat_types";
import { NamedTypedPlace } from "../shared/types";
import {
  computeRatio,
  getMatchingObservation,
  shouldShowMapBoundaries,
  toTitleCase,
} from "./shared_util";

test("getMatchingObservation", () => {
  let series = [
    {
      date: "2017",
      value: 1,
    },
    {
      date: "2018",
      value: 2,
    },
    {
      date: "2020",
      value: 3,
    },
  ];
  expect(getMatchingObservation(series, "2018").date).toEqual("2018");
  expect(getMatchingObservation(series, "2016").date).toEqual("2017");
  expect(getMatchingObservation(series, "2021").date).toEqual("2020");
  expect(getMatchingObservation(series, "2019").date).toEqual("2018");
  expect(getMatchingObservation(series, "2018-07").date).toEqual("2018");
  expect(getMatchingObservation(series, "2019-07").date).toEqual("2018");

  series = [
    {
      date: "2017",
      value: 1,
    },
    {
      date: "2018",
      value: 2,
    },
    {
      date: "2018-02",
      value: 3,
    },
    {
      date: "2018-03",
      value: 4,
    },
    {
      date: "2018-04",
      value: 5,
    },
    {
      date: "2020",
      value: 3,
    },
  ];
  expect(getMatchingObservation(series, "2018").date).toEqual("2018");

  series = [
    {
      date: "2017",
      value: 1,
    },
    {
      date: "2018",
      value: 2,
    },
    {
      date: "2019-02",
      value: 3,
    },
    {
      date: "2019-03",
      value: 4,
    },
    {
      date: "2019-04",
      value: 5,
    },
    {
      date: "2020",
      value: 3,
    },
  ];
  expect(getMatchingObservation(series, "2018").date).toEqual("2018");
});

test("shouldShowMapBoundaries", () => {
  const selectedPlace: NamedTypedPlace = {
    dcid: "country/USA",
    name: "United States of America",
    types: ["Country"],
  };
  expect(shouldShowMapBoundaries(selectedPlace, "County")).toEqual(false);
  expect(shouldShowMapBoundaries(selectedPlace, "State")).toEqual(true);
});

test("toTitleCase", () => {
  expect(toTitleCase("asia")).toEqual("Asia");
  expect(toTitleCase("EARTH")).toEqual("Earth");
  expect(toTitleCase("NoRTH AmeRIcA")).toEqual("North America");
});

test("compute ratio", () => {
  const statSeries: Observation[] = [
    {
      date: "2001",
      value: 1000,
    },
    {
      date: "2005",
      value: 2000,
    },
    {
      date: "2010",
      value: 3000,
    },
  ];
  const popSeries: Observation[] = [
    {
      date: "2001",
      value: 100,
    },
    {
      date: "2004",
      value: 200,
    },
    {
      date: "2009",
      value: 300,
    },
  ];
  const expected: Observation[] = [
    {
      date: "2001",
      value: 10,
    },
    {
      date: "2005",
      value: 10,
    },
    {
      date: "2010",
      value: 10,
    },
  ];
  expect(computeRatio(statSeries, popSeries)).toEqual(expected);
});

test("compute ratio not aligned", () => {
  const statSeries: Observation[] = [
    {
      date: "2005",
      value: 1000,
    },
    {
      date: "2010",
      value: 1100,
    },
    {
      date: "2015",
      value: 1200,
    },
  ];
  const popSeries: Observation[] = [
    {
      date: "2005",
      value: 100,
    },
    {
      date: "2006",
      value: 200,
    },
    {
      date: "2007",
      value: 300,
    },
    {
      date: "2008",
      value: 100,
    },
    {
      date: "2009",
      value: 200,
    },
  ];
  const expected: Observation[] = [
    {
      date: "2005",
      value: 10,
    },
    {
      date: "2010",
      value: 5.5,
    },
    {
      date: "2015",
      value: 6,
    },
  ];
  expect(computeRatio(statSeries, popSeries)).toEqual(expected);
});
