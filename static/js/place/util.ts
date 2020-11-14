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

import pluralize from "pluralize";
import { intl } from "../l10n/i18n";

/**
 * Given a list of parent places, return true if the place is in USA.
 */
export function isPlaceInUsa(dcid: string, parentPlaces: string[]): boolean {
  if (dcid === "country/USA") {
    return true;
  }
  for (const parent of parentPlaces) {
    if (parent === "country/USA") {
      return true;
    }
  }
  return false;
}

/**
 * Returns place type, possibly pluralized if requested.
 * TODO(datcom): i18n pluralization cases
 *
 * @param {string} placeType PlaceType, as taken from the Data Commons Graph (in CamelCase).
 * @param {boolean} isPlural True if the result should be pluralized.
 *
 * @return {string} Pluralized string for display.
 */
export function displayNameForPlaceType(
  placeType: string,
  isPlural = false
): string {
  if (
    placeType.startsWith("AdministrativeArea") ||
    placeType.startsWith("Eurostat")
  ) {
    return isPlural
      ? intl.formatMessage({
          // Matching ID as above
          id: "plural_places",
          // Default Message in English. Note that this will still log error.
          // TODO(tjann): See if we can surpress error logs.
          defaultMessage: "Places",
          description:
            "General collection of places. Used for comparison charts of Places in California.",
        })
      : intl.formatMessage({
          // Matching ID as above
          id: "singular_place",
          // Default Message in English. Note that this will still log error.
          // TODO(tjann): See if we can surpress error logs.
          defaultMessage: "Place",
          description:
            "A general type of place. E.g. Lincoln Center is a Place in NYC.",
        });
  }
  if (placeType === "CensusZipCodeTabulationArea") {
    return isPlural
      ? intl.formatMessage({
          // Matching ID as above
          id: "plural_zip_codes",
          // Default Message in English. Note that this will still log error.
          // TODO(tjann): See if we can surpress error logs.
          defaultMessage: "Zip Codes",
          description:
            "A collection of Zip Codes. Used in ranking pages, etc. E.g. Rankings of Number of Employed People for Zip Codes in USA.",
        })
      : intl.formatMessage({
          // Matching ID as above
          id: "singular_place",
          // Default Message in English. Note that this will still log error.
          // TODO(tjann): See if we can surpress error logs.
          defaultMessage: "Zip Code",
          description: "A Zip Code. E.g. 94539 is a Zip Code in CA.",
        });
  }
  return isPlural ? pluralize(placeType) : placeType;
}
