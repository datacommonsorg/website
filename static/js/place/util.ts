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
import { intl, translateVariableString } from "../i18n/i18n";

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
 * TODO(datcom): i18n pluralization cases--maybe possible to reduce this code.
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
          id: "plural_places",
          defaultMessage: "Places",
          description:
            'General collection of places. It is used when we don"t have a specific place type. Some examples: "_Places_ in Russia" as a header for a section with links to many places contained in Russia, as chart titles, such as "Median Age: _Places_ near Paris" or "Median Age: Other _Places_", or "Ranking for All _Places_ in Russia".',
        })
      : intl.formatMessage({
          id: "singular_place",
          defaultMessage: "Place",
          description:
            'A general type of place. It is used as a top-level description of places with uncommon place types such as Eurostat NUTS or AdministrativeArea 1-5. For example, we may say "Moscow Oblast is A _Place_ in Russia" or "Lincoln Center is a _Place_ in New York City".',
        });
  }
  if (placeType === "CensusZipCodeTabulationArea") {
    return isPlural
      ? intl.formatMessage({
          id: "plural_zip_codes",
          defaultMessage: "Zip Codes",
          description:
            'A collection of ZIP Codes. Some examples: "_ZIP Codes_ in Fremont" or "Median Age: _ZIP Codes_ near 94539", "Median Age: Other _ZIP Codes_" or "Rankings of Number of Employed People for _ZIP Codes_ in Santa Clara County".',
        })
      : intl.formatMessage({
          id: "singular_zip_code",
          defaultMessage: "ZIP Code",
          description:
            'A ZIP Code area. Some examples, we say that 94539 is "A _ZIP Code_ in Alameda County, California, United States of America, North America".',
        });
  }
  // TODO(datcom): translate before or after pluralize?
  // pluralize seems to work with Spanish, but there's little documentation.
  return isPlural
    ? pluralize(translateVariableString(placeType))
    : translateVariableString(placeType);
}
