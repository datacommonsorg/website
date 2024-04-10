/**
 * Copyright 2020 Google LLC
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

import { MAX_DATE, MAX_YEAR, SOURCE_DISPLAY_NAME } from "./constants";

// This has to be in sync with server/__init__.py
export const placeExplorerCategories = [
  "economics",
  "health",
  "equity",
  "crime",
  "education",
  "demographics",
  "housing",
  "environment",
  "energy",
];

const NO_DATE_CAP_RCP_STATVARS = [
  // This stat var only has data for 2100. while other stat vars along the same
  // lines (eg. NumberOfMonths_5CelsiusOrMore_Percentile90AcrossModels_) have
  // data for 2030, 2050, and 2100 so we want to cap the date for those at 2050.
  "NumberOfMonths_5CelsiusOrMore_Percentile10AcrossModels_",
  // These stat vars compare against historical observed data, so we do not want
  // to hardcode the default date.
  "DifferenceRelativeToObservationalData_",
  // These SVs are not a time-series, but a single value across multi-decadal time-horizons.
  "ProjectedMax_Until_",
  "ProjectedMin_Until_",
  // All PDF probability projections should be excluded.
  "PctProb_",
];

// used to set fields in an object
export interface Setter<T> {
  (value: T): void;
}

export function randDomId(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(2, 10);
}

/**
 * Downloads a file under a given filename.
 * @param filename name to download the file to
 * @param file the file to download
 */
export function downloadFile(fileName: string, file: Blob | File): void {
  const link = document.createElement("a");
  const url = window.URL.createObjectURL(file);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.onclick = () => {
    setTimeout(() => window.URL.revokeObjectURL(url));
  };
  link.click();
  link.remove();
}

/**
 * Saves csv to filename.
 * @param {filename} string
 * @param {contents} string
 * @return void
 */
export function saveToFile(filename: string, contents: string): void {
  let mimeType = "text/plain";
  if (filename.match(/\.csv$/i)) {
    mimeType = "text/csv;charset=utf-8";
  } else if (filename.match(/\.svg$/i)) {
    mimeType = "image/svg+xml;charset=utf-8";
  }
  const blob = new Blob([contents], { type: mimeType });
  downloadFile(filename, blob);
}

/**
 * Get display text from a url.
 */
export function urlToDisplayText(url: string): string {
  if (!url) {
    return "";
  }
  if (url in SOURCE_DISPLAY_NAME) {
    return SOURCE_DISPLAY_NAME[url];
  }
  // Use domain as the default display name
  return url
    .replace("http://", "")
    .replace("https://", "")
    .replace("www.", "")
    .split(/[/?#]/)[0];
}

export function isDateTooFar(date: string): boolean {
  return date.slice(0, 4) > MAX_YEAR;
}

/**
 * Hack for handling stat vars with dates with (predicted) dates in the future.
 * If a defaultDate is specified, always return that.
 * If variable has future observations, return either MAX_YEAR or MAX_DATE
 * Otherwise, return ""
 * TODO: Find a better way to accomodate variables with dates in the future
 */
export function getCappedStatVarDate(
  statVarDcid: string,
  defaultDate = ""
): string {
  if (defaultDate) {
    return defaultDate;
  }
  // Only want to cap stat var date for stat vars with RCP or SSP.
  if (!statVarDcid.includes("_RCP") && !statVarDcid.includes("_SSP")) {
    return "";
  }
  for (const svSubstring of NO_DATE_CAP_RCP_STATVARS) {
    if (statVarDcid.includes(svSubstring)) {
      return "";
    }
  }
  // Wet bulb temperature is observed at P1Y, so need to use year for the date.
  if (
    statVarDcid.includes("WetBulbTemperature") ||
    statVarDcid.includes("AggregateMin_Percentile") ||
    statVarDcid.includes("AggregateMax_Percentile") ||
    statVarDcid.includes("AggregateMin_Median") ||
    statVarDcid.includes("AggregateMax_Median") ||
    statVarDcid.includes("NumberOfMonths_")
  ) {
    return MAX_YEAR;
  }
  return MAX_DATE;
}

/**
 * Makes the spinner visible if there is one within the specific container with the given id.
 * @param containerId the id of the container to show spinner in
 */
export function loadSpinner(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    const browserScreens = container.getElementsByClassName("screen");
    if (!_.isEmpty(browserScreens)) {
      browserScreens[0].classList.add("d-block");
    }
  }
}

/**
 * Removes the spinner if there is one within the specific container with the given id.
 * @param containerId the id of the container to remove spinner from
 */
export function removeSpinner(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    const browserScreens = container.getElementsByClassName("screen");
    if (!_.isEmpty(browserScreens)) {
      browserScreens[0].classList.remove("d-block");
    }
  }
}
