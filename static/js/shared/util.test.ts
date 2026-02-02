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
import { getCappedStatVarDate, isDateTooFar, sanitizeSourceUrl } from "./util";

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

describe("sanitizeSourceUrl", () => {
  test.each([
    // http and https urls should be returned as is
    ["https://example.com", "https://example.com/"],
    ["http://example.com", "http://example.com/"],
    // urls without protocol should be prefixed with https
    ["example.com", "https://example.com/"],
    ["www.example.com", "https://www.example.com/"],
    // whitespace should be handled elegantly
    ["  example.com  ", "https://example.com/"],
    // urls with javascript, vbscript, or data should be sanitized
    ["javascript:alert(1)", ""],
    ["vbscript:alert(1)", ""],
    ["data:text/html,<html></html>", ""],
    ["https://javascript:alert(1)", ""],
    ["http://vbscript:alert(1)", ""],
    ["<html>data:text/html,<html></html>", ""],
    // Valid paths with javascript, vbscript, or data should be preserved
    [
      "https://en.wikipedia.org/wiki/JavaScript",
      "https://en.wikipedia.org/wiki/JavaScript",
    ],
    ["http://example.com/vbscript/about", "http://example.com/vbscript/about"],
    [
      "https://my-app.com/api?data=dataPayload",
      "https://my-app.com/api?data=dataPayload",
    ],
    ["http://javascript.com", "http://javascript.com/"],
    // empty string should not result in error
    ["", ""],
  ])("should convert %p to %p", (input, expected) => {
    expect(sanitizeSourceUrl(input)).toEqual(expected);
  });
});
