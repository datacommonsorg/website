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
import { isDateTooFar, shouldCapStatVarDate } from "./util";

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

test("shouldCapStatVarDate", () => {
  const data = {
    Count_Person: false,
    DifferenceRelativeToBaseDate2006_Daily_PrecipitationRate_RCP26: true,
    Daily_PrecipitationRate: false,
  };
  for (const date in data) {
    expect(shouldCapStatVarDate(date)).toEqual(data[date]);
  }
});
