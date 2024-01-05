/**
 * Copyright 2024 Google LLC
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

import _ from "lodash";
import { Observation } from "./data_commons_web_client_types";

/**
 * Converts an object to URLSearchParams.
 *
 * Example:
 *
 * Input:
 * `{
 *   "string_key": "string_value",
 *   "number_key": 123,
 *   "string_arr_key": ["value1", "value2"]
 * }`
 *
 * Returns a URLSearchParams object with the equivalent query string:
 * `string_key=string_value&number_key=123&string_arr_key=value1&string_arr_key=value2`
 *
 * @param obj object to convert URLSearchParams
 * @returns URLSearchParams object
 */
export const toURLSearchParams = (
  obj: Record<string, string | string[] | number | null | undefined>
) => {
  const urlSearchParams = new URLSearchParams();
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined || obj[key] === null) {
      return;
    }
    if (typeof obj[key] == "object") {
      const values = obj[key] as string[];
      values.forEach((value) => {
        urlSearchParams.append(key, value);
      });
      return;
    }
    urlSearchParams.append(key, String(obj[key]));
  });
  // Sort search params for easier unit testing query string comparisons
  urlSearchParams.sort();
  return urlSearchParams;
};

/**
 * Encodes an array to a valid CSV row. Replaces double quotes with double-double quotes (`" -> ""`)
 *
 * Example: `["String one", 'String "two"', 123, null, true]`
 * Returns: `"String one","String ""two""",123,null,true`
 * @param items array of strings, numbers, booleans, etc.
 * @returns CSV row
 */
export function encodeCsvRow(items: any[]): string {
  return items
    .map((item) => {
      if (typeof item === "string") {
        // Quote strings and replace all double quotes (") with double-double quotes ("")
        return `"${item.replace(/"/g, '""')}"`;
      }
      return String(item);
    })
    .join(",");
}

/**
 * Given a observation series `num`, computes the ratio of the each
 * observation value in `num` to the observation value in `denom` with
 * the closest date value.
 *
 * Both `num` and `denom` series are sorted.
 *
 * @param num Sorted numerator observation series.
 * @param denom Sorted denominator time series.
 *
 * @returns A list of Observations with the per capita calculation applied to its values.
 */
export function computeRatio(
  num: Observation[],
  denom: Observation[],
  scaling = 1
): Observation[] {
  if (_.isEmpty(denom)) {
    return [];
  }
  const result: Observation[] = [];
  let j = 0; // denominator position
  for (let i = 0; i < num.length; i++) {
    const numDate = Date.parse(num[i].date);
    const denomDate = Date.parse(denom[j].date);
    while (j < denom.length - 1 && numDate > denomDate) {
      const denomDateNext = Date.parse(denom[j + 1].date);
      const nextBetter =
        Math.abs(denomDateNext - numDate) < Math.abs(denomDate - numDate);
      if (nextBetter) {
        j++;
      } else {
        break;
      }
    }
    let val: number;
    if (denom[j].value == 0) {
      val = 0;
    } else {
      val = num[i].value / denom[j].value / scaling;
    }
    result.push({ date: num[i].date, value: val });
  }
  return result;
}
