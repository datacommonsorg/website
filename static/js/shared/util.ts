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

import axios from "axios";
import _ from "lodash";

import { ALL_MAP_PLACE_TYPES } from "../tools/map/util";
import { EARTH_NAMED_TYPED_PLACE, MAX_DATE, MAX_YEAR } from "./constants";
import { NamedTypedPlace } from "./types";

// This has to be in sync with server/__init__.py
export const placeExplorerCategories = [
  "economics",
  "health",
  "equity",
  "crime",
  "education",
  "demographics",
  "housing",
  "climate",
  "energy",
];

const NO_DATE_CAP_RCP_STATVARS = [
  "NumberOfMonths_5CelsiusOrMore_Percentile10AcrossModels_",
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
 * Saves csv to filename.
 * @param {filename} string
 * @param {contents} string
 * @return void
 */
export function saveToFile(filename: string, contents: string): void {
  let mimeType = "text/plan";
  if (filename.match(/\.csv$/i)) {
    mimeType = "text/csv;chartset=utf-8";
  } else if (filename.match(/\.svg$/i)) {
    mimeType = "image/svg+xml;chartset=utf-8";
  }
  const blob = new Blob([contents], { type: mimeType });
  const link = document.createElement("a");
  const url = window.URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.onclick = () => {
    setTimeout(() => window.URL.revokeObjectURL(url));
  };
  link.click();
  link.remove();
}

/**
 * Get the domain from a url.
 */
export function urlToDomain(url: string): string {
  if (!url) {
    return "";
  }
  return url
    .replace("http://", "")
    .replace("https://", "")
    .replace("www.", "")
    .split(/[/?#]/)[0];
}

export function isDateTooFar(date: string): boolean {
  return date.slice(0, 4) > MAX_YEAR;
}

export function getCappedStatVarDate(statVar: string): string {
  // Only want to cap stat var date for stat vars with RCP.
  if (!statVar.includes("_RCP")) {
    return "";
  }
  for (const svSubstring of NO_DATE_CAP_RCP_STATVARS) {
    if (statVar.includes(svSubstring)) {
      return "";
    }
  }
  // Wet bulb temperature is observed at P1Y, so need to use year for the date.
  if (
    statVar.includes("WetBulbTemperature") ||
    statVar.includes("AggregateMin_Percentile") ||
    statVar.includes("AggregateMax_Percentile") ||
    statVar.includes("AggregateMin_Median") ||
    statVar.includes("AggregateMax_Median") ||
    statVar.includes("NumberOfMonths_")
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
 * Used to get and set parent places
 * @param placeDcid the place to get parent places for
 * @param setParentPlaces the function to set parent places
 */
export function loadParentPlaces(
  placeDcid: string,
  setParentPlaces: Setter<Array<NamedTypedPlace>>
): void {
  axios
    .get(`/api/place/parent/${placeDcid}`)
    .then((resp) => {
      const parentsData = resp.data;
      const filteredParentsData = parentsData.filter((parent) => {
        for (const type of parent.types) {
          if (type in ALL_MAP_PLACE_TYPES) {
            return true;
          }
        }
        return false;
      });
      const parentPlaces = filteredParentsData.map((parent) => {
        return { dcid: parent.dcid, name: parent.name, types: parent.types };
      });
      if (placeDcid !== EARTH_NAMED_TYPED_PLACE.dcid) {
        parentPlaces.push(EARTH_NAMED_TYPED_PLACE);
      }
      setParentPlaces(parentPlaces);
    })
    .catch(() => setParentPlaces([]));
}
