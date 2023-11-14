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
import _ from "lodash";

const MIN_HIGH_CONF_DETECT = 0.9;

function detectDate(header: string): boolean {
  // Date is detected if header is a valid ISO-8601 format.
  // Note also: since we are only interested in detecting dates (and not time),
  // if the header string length is <= 3, we consider that to be invalid.
  const d = Date.parse(header);
  return !Number.isNaN(d) && header.length > 3;
}

/**
 * detectColumnHeaderDate returns true if 'header' can be parsed as valid Date
 * objects.
 *
 * @param header: the column header string.
 *
 * @returns a boolean which is true if 'header' can be parsed as valid Date
 *         object. It returns false otherwise.
 */
export function detectColumnHeaderDate(header: string): boolean {
  return detectDate(header);
}

/**
 * detectColumnWithDates returns true if > 90% of the non-empty string 'values'
 * can be parsed as valid Date objects. It returns false otherwise.
 *
 * @param header: the column header string.
 * @param values: an array of string column values.
 *
 * @returns a boolean which is true if > 90% of values can be parsed as valid
 *     date objects. It returns false otherwise.
 */
export function detectColumnWithDates(
  header: string,
  values: Array<string>
): boolean {
  let detected = 0;
  let total = 0;

  for (const d of values) {
    if (!_.isEmpty(d)) {
      total++;
      if (detectDate(d)) {
        detected++;
      }
    }
  }
  return detected > MIN_HIGH_CONF_DETECT * total;
}
