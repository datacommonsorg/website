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

import { intl } from "../i18n/i18n";
import { tileMessages } from "../i18n/i18n_tile_messages";

const placeTypeToPlural = {
  place: "places",
  continent: "continents",
  country: "countries",
  state: "states",
  province: "provinces",
  county: "counties",
  district: "districts",
  division: "divisions",
  department: "departments",
  municipality: "municipalities",
  parish: "parishes",
  city: "cities",
  censustract: "census tracts",
  tract: "tracts",
  censuszipcodetabulationarea: "census zip code tabulation areas",
  zip: "zips",
  zipcode: "zip codes",
  town: "towns",
  village: "villages",
  censusdivision: "census divisions",
  borough: "boroughs",
  eurostatnuts1: "eurostat NUTS 1 places",
  eurostatnuts2: "eurostat NUTS 2 places",
  eurostatnuts3: "eurostat NUTS 3 places",
  administrativearea1: "administrative area 1 places",
  administrativearea2: "administrative area 2 places",
  administrativearea3: "administrative area 3 places",
  administrativearea4: "administrative area 4 places",
  administrativearea5: "administrative area 5 places",
  region: "regions",
  highschool: "high schools",
  middleschool: "middle schools",
  elementaryschool: "elementary schools",
  primaryschool: "primary schools",
  publicschool: "public schools",
  privateschool: "private schools",
  school: "schools",
};

const months = {
  0: "Jan",
  1: "Feb",
  2: "Mar",
  3: "Apr",
  4: "May",
  5: "Jun",
  6: "Jul",
  7: "Aug",
  8: "Sep",
  9: "Oct",
  10: "Nov",
  11: "Dec",
};

/**
 * If the date is in YYYY-MM format, returns YYYY-MMM format.
 * This is to improve readability of dates in chart titles.
 */
export function formatDate(strDate: string): string {
  if (strDate.length == 7) {
    const dt = new Date(strDate);
    return (
      months[dt.getUTCMonth()] +
      ", " +
      new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(dt)
    );
  } else {
    return strDate;
  }
}

/**
 *  Given a list of dates as strings, returns the date range as a string
 */
export function getDateRange(dates: string[]): string {
  if (dates.length === 0) {
    return "";
  }
  const minDate = formatDate(_.min(dates));
  const maxDate = formatDate(_.max(dates));
  return minDate === maxDate
    ? `${minDate}`
    : intl.formatMessage(tileMessages.dateRange, { minDate, maxDate });
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
  if (Number.isNaN(Date.parse(date))) {
    return false;
  }
  const dateRegex = /^(\d\d\d\d)(-\d\d)?(-\d\d)?$/;
  return dateRegex.test(date);
}

export function getPlaceTypePlural(placeType: string): string {
  const l = placeType.toLowerCase();
  if (l in placeTypeToPlural) {
    return placeTypeToPlural[l];
  }
  return "places";
}
