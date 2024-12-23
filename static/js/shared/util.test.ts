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

/* eslint-disable camelcase */

import { MAX_DATE, MAX_YEAR } from "./constants";
import { getCappedStatVarDate, isDateTooFar } from "./util";

test("isDateTooFar", () => {
  const data = {
    "2011": false,
    "2021-10": false,
    "2051": true,
    "2052-12": true,
  };
  for (const date in data) {
    expect(isDateTooFar(date)).toEqual(data[date]);
  }
});

test("getCappedStatVarDate", () => {
  const data = {
    Count_Person: "",
    DifferenceRelativeToBaseDate2006_PrecipitationRate_RCP26: MAX_DATE,
    DifferenceRelativeToBaseDate2015_Max_Temperature_SSP245: MAX_DATE,
    NumberOfMonths_5CelsiusOrMore_MedianAcrossModels_DifferenceRelativeToBaseDate2006_Max_Temperature_RCP85:
      MAX_YEAR,
    NumberOfMonths_5CelsiusOrMore_Percentile10AcrossModels_DifferenceRelativeToBaseDate2006_Max_Temperature_RCP85:
      "",
    NumberOfMonths_5CelsiusOrMore_Percentile90AcrossModels_DifferenceRelativeToBaseDate2006_Max_Temperature_RCP85:
      MAX_YEAR,
    NumberOfMonths_WetBulbTemperature_35COrMore_RCP85: MAX_YEAR,
    PrecipitationRate: "",
  };
  for (const sv in data) {
    expect(getCappedStatVarDate(sv)).toEqual(data[sv]);
    // Setting a default date should always return the default
    expect(getCappedStatVarDate(sv, "1995")).toEqual("1995");
  }
});
