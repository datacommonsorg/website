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
 *  Given a list of dates as strings, returns the date range as a string
 */
export function getDateRange(dates: string[]): string {
  const minDate = _.min(dates);
  const maxDate = _.max(dates);
  return minDate === maxDate ? `${minDate}` : `${minDate} to ${maxDate}`;
}

/**
 * Given a list of words, returns the common prefix between the words. If there
 * is only one word in the list, return that word.
 */
export function getCommonPrefix(words: string[]): string {
  if (_.isEmpty(words)) {
    return "";
  }
  if (words.length === 1) {
    return words[0];
  }
  const sortedWordsList = words.sort();
  const firstWord = sortedWordsList[0];
  const lastWord = sortedWordsList[sortedWordsList.length - 1];
  let idx = 0;
  while (
    idx < firstWord.length &&
    idx < lastWord.length &&
    firstWord.charAt(idx) === lastWord.charAt(idx)
  ) {
    idx++;
  }
  return firstWord.slice(0, idx);
}

/**
 * Given a date string, check that it is in the form YYYY-MM-DD or YYYY-MM or YYYY
 */
export function isValidDate(date: string): boolean {
  const dateRegex = /^(\d\d\d\d)(-\d\d)?(-\d\d)?$/;
  return dateRegex.test(date);
}
