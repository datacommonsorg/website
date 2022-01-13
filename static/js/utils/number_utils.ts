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

/**
 * Formats a number, or returns "N/A" if not a number.
 * If the number is a float, keeps three non-zero decimal places.
 * eg. 0.000346546758 -> 0.000357
 * @param num
 */
export function getStringOrNA(num: number): string {
  return _.isNil(num)
    ? "N/A"
    : Number.isInteger(num)
    ? num.toString()
    : num.toFixed(2 - Math.floor(Math.log(Math.abs(num % 1)) / Math.log(10)));
}

/**
 * Checks if a number is in an inclusive range.
 */
export function isBetween(num: number, lower: number, upper: number): boolean {
  if (_.isNil(lower) || _.isNil(upper) || _.isNil(num)) {
    return true;
  }
  return lower <= num && num <= upper;
}
