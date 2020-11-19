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
            "General collection of places. It is used in several places when we don't have a specific place type. First use case example: for Russia, we simply have a heading Places in Russia on the sidebar with links to many places contained in Russia. Second use case example: for comparison charts, such as Median Age: Places near Sai Kung. Or Median Age: Other Places. Third use case example: for the ranking pages, we may say that the page ranks the life expectancy for All Places in Russia.",
        })
      : intl.formatMessage({
          id: "singular_place",
          defaultMessage: "Place",
          description:
            "A general type of place. It is used in place pages as a top-level description of places with uncommon place types such as Eurostat NUTS or AdministrativeArea 1-5. For example, we may say Moscow Oblast is A Place in Russia, Asia. Or, Lincoln Center is a Place in New York City.",
        });
  }
  if (placeType === "CensusZipCodeTabulationArea") {
    return isPlural
      ? intl.formatMessage({
          id: "plural_zip_codes",
          defaultMessage: "ZIP Codes",
          description:
            'A collection of ZIP Codes. It is used in several parts of our website to display "ZIP Codes" instead of "Census Zip Code Tabulation Area", which is the actual text stored in the Data Commons graph. First use case example: for Fremont, we simply have a heading "ZIP Codes in Fremont" on the sidebar with links to many zip code areas contained in Fremont. Second use case example: for comparison charts, such as "Median Age: ZIP Codes near 94539". Or "Median Age: Other ZIP Codes". Third use case example: for the ranking pages, we may say "Rankings of Number of Employed People for ZIP Codes in Santa Clara County".',
        })
      : intl.formatMessage({
          id: "singular_zip_code",
          defaultMessage: "ZIP Code",
          description:
            'A ZIP Code area. Used in place pages as a top-level description of a ZIP Code. For example, we say that 94539 is "A ZIP Code in Alameda County, California, United States of America, North America".',
        });
  }
  // TODO(datcom): translate before or after pluralize?
  // pluralize seems to work with Spanish, but there's little documentation.
  return isPlural
    ? pluralize(translateVariableString(placeType))
    : translateVariableString(placeType);
}
