/**
 * Copyright 2022 Google LLC
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

import { getUnit } from "./stat_metadata_utils";

test("getUnit", () => {
  const testUnit = "Millimeter";
  const shortUnit = "mm";
  const baseSourceSeries = {
    provenanceUrl: "testProv",
    val: { "2012-11": 123.45 },
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

  const sourceSeriesWithUnitDisplayName = {
    ...baseSourceSeries,
    scalingFactor: "100",
    unit: testUnit,
    unitDisplayName: shortUnit,
  };
  expect(getUnit(sourceSeriesWithUnitAndScalingFactor) === shortUnit);
});
