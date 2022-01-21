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
import { NamedTypedPlace } from "../shared/types";
import {
  getPopulationDate,
  shouldShowMapBoundaries,
  toTitleCase,
} from "./shared_util";

test("getPopulationDate", () => {
  const basePopData = {
    val: {
      "2017": 1,
      "2018": 2,
      "2020": 3,
    },
    metadata: {
      provenanceUrl: "provenance",
    },
  };
  const baseStatData = {
    date: "2018",
    value: 10,
    metadata: {
      importName: "importName",
    },
  };
  expect(getPopulationDate(basePopData, baseStatData)).toEqual("2018");

  const statDataDateEarlierThanPopData = {
    ...baseStatData,
    date: "2016",
  };
  expect(
    getPopulationDate(basePopData, statDataDateEarlierThanPopData)
  ).toEqual("2017");

  const statDataDateLaterThanPopData = {
    ...baseStatData,
    date: "2021",
  };
  expect(getPopulationDate(basePopData, statDataDateLaterThanPopData)).toEqual(
    "2020"
  );

  const statDataNoMatchingDate = {
    ...baseStatData,
    date: "2019",
  };
  expect(getPopulationDate(basePopData, statDataNoMatchingDate)).toEqual(
    "2018"
  );

  const statDataDateMoreSpecific = {
    ...baseStatData,
    date: "2018-07",
  };
  expect(getPopulationDate(basePopData, statDataDateMoreSpecific)).toEqual(
    "2018"
  );

  const statDataDateMoreSpecificNoMatching = {
    ...baseStatData,
    date: "2019-07",
  };
  expect(
    getPopulationDate(basePopData, statDataDateMoreSpecificNoMatching)
  ).toEqual("2018");

  const popDataDateMoreSpecific = {
    ...basePopData,
    val: {
      "2018-02": 1,
      "2018-03": 2,
      "2018-04": 3,
    },
  };
  expect(getPopulationDate(popDataDateMoreSpecific, baseStatData)).toEqual(
    "2018-04"
  );

  const popDataDateMoreSpecificNoMatching = {
    ...basePopData,
    val: {
      "2019-02": 1,
      "2019-03": 2,
      "2019-04": 3,
    },
  };
  expect(
    getPopulationDate(popDataDateMoreSpecificNoMatching, baseStatData)
  ).toEqual("2019-02");
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
