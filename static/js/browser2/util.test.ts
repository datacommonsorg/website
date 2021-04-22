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

import { getPageDisplayType, PageDisplayType } from "./types";
import { removeLoadingMessage, getUnit } from "./util";

test("getPageDisplayType", () => {
  // non empty stat var id
  expect(getPageDisplayType(["Country"], "testStatVar")).toEqual(
    PageDisplayType.PLACE_STAT_VAR
  );
  // list of types contains City
  expect(getPageDisplayType(["City", "AdminArea1"], "")).toEqual(
    PageDisplayType.PLACE_WITH_WEATHER_INFO
  );
  // list of types contains CensusZipCodeTabulationArea
  expect(
    getPageDisplayType(["CensusZipCodeTabulationArea", "Zipcode"], "")
  ).toEqual(PageDisplayType.PLACE_WITH_WEATHER_INFO);
  // list of types contains BiologicalSpecimen
  expect(getPageDisplayType(["BiologicalSpecimen"], "")).toEqual(
    PageDisplayType.BIOLOGICAL_SPECIMEN
  );
  // list of types doesn't contain anything special
  expect(getPageDisplayType(["country"], "")).toEqual(PageDisplayType.GENERAL);
});

test("removeLoadingMessage", () => {
  document.body.innerHTML = '<div id="page-loading"></div>';
  removeLoadingMessage();
  expect(document.getElementById("page-loading").style.display).toBe("none");
});

test("getUnit", () => {
  const testUnit = "Millimeter";
  const baseSourceSeries = {
    provenanceDomain: "testProv",
    val: { valKey: "val" },
  };
  expect(getUnit(baseSourceSeries) === "");

  const sourceSeriesWithUnit = { ...baseSourceSeries, unit: testUnit };
  expect(getUnit(sourceSeriesWithUnit) === testUnit);

  const sourceSeriesWithValidScalingFactor = {
    ...baseSourceSeries,
    scalingFactor: "100",
  };
  expect(getUnit(sourceSeriesWithValidScalingFactor) === "%");

  const sourceSeriesWithInvalidScalingFactor = {
    ...baseSourceSeries,
    scalingFactor: "1000",
  };
  expect(getUnit(sourceSeriesWithInvalidScalingFactor) === "");

  const sourceSeriesWithUnitAndScalingFactor = {
    ...baseSourceSeries,
    scalingFactor: "100",
    unit: testUnit,
  };
  expect(getUnit(sourceSeriesWithUnitAndScalingFactor) === testUnit);
});
