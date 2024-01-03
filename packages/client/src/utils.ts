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
