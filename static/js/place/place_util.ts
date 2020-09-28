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

import { childPlacesType, parentPlacesType } from "./place_types";
import pluralize from "pluralize";

export function childPlaceTypeWithMostPlaces(
  childPlaces: childPlacesType
): string {
  let maxType = "place";
  let maxChildren = 0;
  for (const type in childPlaces) {
    const children = childPlaces[type];
    if (children.length > maxChildren) {
      maxChildren = children.length;
      maxType = type;
    }
  }
  return maxType;
}

/**
 * Given a list of parent places, return true if the place is in USA.
 */
export function isPlaceInUsa(parentPlaces: parentPlacesType): boolean {
  for (const parent of parentPlaces) {
    if (parent.dcid == "country/USA") {
      return true;
    }
  }
  return false;
}

/**
 * Returns place type, possibly pluralized if requested.
 *
 * @param {string} placeType PlaceType, as taken from the Data Commons Graph (in CamelCase).
 * @param {boolean} isPlural True if the result should be pluralized.
 *
 * @return {string} Pluralized string for display.
 */
export function displayNameForPlaceType(
  placeType: string,
  isPlural: boolean = false
): string {
  if (
    placeType.startsWith("AdministrativeArea") ||
    placeType.startsWith("Eurostat")
  ) {
    return isPlural ? "Places" : "Place";
  }
  if (placeType === "CensusZipCodeTabulationArea") {
    return isPlural ? "Zip Codes" : "Zip Code";
  }
  return isPlural ? pluralize(placeType) : placeType;
}
