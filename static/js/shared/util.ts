/**
 * Copyright 2025 Google LLC
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
import { URLSearchParams } from "url";

import { Theme } from "../theme/types";
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
  "health_new",
  "energy_new",
  "crime_new",
  "demographics_new",
  "economics_new",
];

const SEARCH_PARAMS_TO_PROPAGATE = new Set(["hl"]);

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
    .slice(2, 12);
}

/** Determines if the width corresponds to mobile based on themes. */
export function isMobileByWidth(theme: Theme | null): boolean {
  if (theme === null) {
    return false;
  }
  return window.innerWidth <= (theme?.breakpoints?.sm ?? 768);
}

/**
 * Downloads a file under a given filename.
 * @param fileName name to download the file to
 * @param file the file to download
 */
export function downloadFile(fileName: string, file: Blob | File): void {
  const link = document.createElement("a");
  const url = window.URL.createObjectURL(file);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.onclick = (): void => {
    setTimeout(() => window.URL.revokeObjectURL(url));
  };
  link.click();
  link.remove();
}

/**
 * Saves csv to filename.
 * @param filename
 * @param contents
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

/**
 * This function removes the protocol from a url.
 *
 * Example:
 *
 * stripProtocol("https://datacommons.org")
 *  -> "datacommons.org"
 */
export function stripProtocol(url: string): string {
  if (!url) {
    return "";
  }
  return url.replace(/^https?:\/\//i, "");
}

/**
 * This function truncates a string to `maxLength`, replacing
 * the excised fragment with `omission`.
 *
 * If maxLength is less omission.length or str is already
 * short enough, the function returns str unchanged.
 *
 * Example:
 *
 * truncateText(
 *  "datacatalog.worldbank.org/dataset/world-development-indicators",'
 *   50, "middle")
 *  -> "datacatalog.worldbank.org…d-development-indicators"
 *
 */
export function truncateText(
  str: string,
  maxLength: number,
  position: "start" | "middle" | "end" = "end",
  omission = "…"
): string {
  if (maxLength <= omission.length || str.length <= maxLength) {
    return str;
  }

  const charactersToKeep = maxLength - omission.length;

  switch (position) {
    case "start":
      return omission + str.slice(str.length - charactersToKeep);
    case "middle": {
      const front = Math.ceil(charactersToKeep / 2);
      const back = Math.floor(charactersToKeep / 2);
      return str.slice(0, front) + omission + str.slice(str.length - back);
    }
    case "end":
    default:
      return str.slice(0, charactersToKeep) + omission;
  }
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

/**
 * Removes the pattern parameter from the query if that substring is present at the end.
 * @param query the string from which to remove the pattern
 * @param pattern a string which we want to find and remove from the query.
 * @returns the query with the pattern removed if it was found.
 */
export function stripPatternFromQuery(query: string, pattern: string): string {
  const regex = new RegExp("(?:.(?!" + pattern + "))+([,;\\s])?$", "i");

  // Returns the query without the pattern parameter.
  // E.g.: query: "population of Calif", pattern: "Calif",
  // returns "population of "
  return query.replace(regex, "");
}

/**
 * Extracts all flags to propagate from the URL.
 */
export function extractFlagsToPropagate(url: string): URLSearchParams {
  try {
    const parsedUrl = new URL(url);
    const searchParams = parsedUrl.searchParams;

    for (const key of searchParams.keys()) {
      if (!SEARCH_PARAMS_TO_PROPAGATE.has(key)) {
        searchParams.delete(key);
      }
    }
    return searchParams;
  } catch (error) {
    console.error("Invalid URL provided:", error);
    return new URLSearchParams();
  }
}

/**
 * Redirects to the destination URL while preserving the URL parameters in the originURL.
 *
 * @param originUrl Current URL from which to extract URL parameters
 * @param destinationUrl Desitnation URL to follow
 * @param overrideParams Parameters to override.
 */
export function redirect(
  originUrl: string,
  destinationUrl: string,
  overrideParams: URLSearchParams = new URLSearchParams()
): void {
  const originParams = extractFlagsToPropagate(originUrl);

  // Override parameters in originParams if necessary.
  overrideParams.forEach((value, key) => {
    originParams.set(key, value);
  });

  let finalUrl = destinationUrl;
  if (originParams.size > 0) {
    finalUrl += "?" + originParams.toString();
  }

  window.open(finalUrl, "_self");
}
