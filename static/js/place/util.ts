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
import { defineMessages } from "react-intl";

import { intl } from "../i18n/i18n";
import { USA_PLACE_DCID } from "../shared/constants";

/**
 * Given a list of parent places, return true if one of them is the USA country DCID.
 */
export function isPlaceContainedInUsa(parentPlaces: string[]): boolean {
  for (const parent of parentPlaces) {
    if (parent === USA_PLACE_DCID) {
      return true;
    }
  }
  return false;
}
/**
 * Given a DCID and list of parent places, returns whether this dcid is the USA, or contained in the USA.
 */
export function isPlaceInUsa(dcid: string, parentPlaces: string[]): boolean {
  return dcid === USA_PLACE_DCID || isPlaceContainedInUsa(parentPlaces);
}

/**
 * A set of place types to render a choropleth for.
 */
export const USA_PLACE_TYPES_WITH_CHOROPLETH = new Set([
  "Country",
  "State",
  "County",
]);

const singularPlaceTypeMessages = defineMessages({
  Country: {
    id: "singular_country",
    defaultMessage: "Country",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/Country. An example use is 'A Country in Europe' to describe 'France'. Please maintain capitalization.",
  },
  State: {
    id: "singular_state",
    defaultMessage: "State",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/Constituent_state, generally a subdivision of a country. An example use is 'A State in United States' to describe 'California'. Please maintain capitalization.",
  },
  County: {
    id: "singular_county",
    defaultMessage: "County",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/County, generally a subdivision of a State. An example use is 'County in California' to describe 'San Mateo County'. Please maintain capitalization.",
  },
  City: {
    id: "singular_city",
    defaultMessage: "City",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/City, generally a place with more people than a town, borough or village. An example use is 'City in France' to describe 'Paris'. Please maintain capitalization.",
  },
  Town: {
    id: "singular_town",
    defaultMessage: "Town",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/Town, generally a place with fewer people than a city, but more than a village. An example use is 'Town in France' to describe 'Paris'. Please maintain capitalization.",
  },
  Village: {
    id: "singular_village",
    defaultMessage: "Village",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/Village, generally a place smaller than a town. An example use is 'Village in Harris County' to describe 'Hilshire Village'. Please maintain capitalization.",
  },
  Borough: {
    id: "singular_borough",
    defaultMessage: "Borough",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/Borough, similar to a town or city. An example use is 'Borough in New York' to describe 'Queens'. Please maintain capitalization.",
  },
  Neighborhood: {
    id: "singular_neighborhood",
    defaultMessage: "Neighborhood",
    description:
      "Label used for an administrative division, akin to definition here https://en.wikipedia.org/wiki/Neighborhood, generally a place within a town or city. An example use is 'Neighborhood in Paris' to describe '8th arrondissement'. Please maintain capitalization.",
  },
  CensusZipCodeTabulationArea: {
    id: "singular_zip_code",
    defaultMessage: "ZIP Code",
    description:
      'A ZIP Code area. Some examples, we say that 94539 is "_ZIP Code_ in Alameda County, California, United States of America, North America".',
  },
  Place: {
    id: "singular_place",
    defaultMessage: "Place",
    description:
      'A general type of place. It is used as a top-level description of places with uncommon place types such as Eurostat NUTS or AdministrativeArea 1-5. For example, we may say "Moscow Oblast is A _Place_ in Russia" or "Lincoln Center is a _Place_ in New York City".',
  },
});

const pluralPlaceTypeMessages = defineMessages({
  Country: {
    id: "plural_country",
    defaultMessage: "Countries",
    description:
      "A label or header for a collection of places of type Country (see https://en.wikipedia.org/wiki/Country). Some examples: 'Countries in Europe', 'Median Age: Other Countries', or 'Ranking by Population for Countries in Europe'. Please maintain capitalization.",
  },
  State: {
    id: "plural_state",
    defaultMessage: "States",
    description:
      "A label or header for a collection of places of type State (generally a subdivision of a Country, see https://en.wikipedia.org/wiki/Constituent_state). Some examples: 'Countries in Europe', 'Median Age: Other Countries', or 'Ranking by Population for Countries in Europe'. Please maintain capitalization.",
  },
  County: {
    id: "plural_county",
    defaultMessage: "Counties",
    description:
      "A label or header for a collection of places of type County (generally subdivisions of a State, see https://en.wikipedia.org/wiki/County). Some examples: 'Counties in California', 'Median Age: Other Counties', or 'Rankings of Population for Counties in California'. Please maintain capitalization.",
  },
  City: {
    id: "plural_city",
    defaultMessage: "Cities",
    description:
      "A label or header for a collection of places of type City (generally places with more people than a town, borough or village, see https://en.wikipedia.org/wiki/City). Some examples: 'Cities in California', 'Median Age: Other Cities', or 'Rankings of Population for Cities in California'. Please maintain capitalization.",
  },
  Town: {
    id: "plural_town",
    defaultMessage: "Towns",
    description:
      "A label or header for a collection of places of type Town (generally places with fewer people than a city, but more than a village, see https://en.wikipedia.org/wiki/Town). Some examples: 'Towns in California', 'Median Age: Other Towns', or 'Rankings of Population for Towns in California'. Please maintain capitalization.",
  },
  Village: {
    id: "plural_village",
    defaultMessage: "Villages",
    description:
      "A label or header for a collection of places of type Village (generally places smaller than a town, see https://en.wikipedia.org/wiki/Village). Some examples: 'Villages in California', 'Median Age: Other Villages', or 'Ranking by Population for Villages in California'. Please maintain capitalization.",
  },
  Borough: {
    id: "plural_borough",
    defaultMessage: "Boroughs",
    description:
      "A label or header for a collection of places of type Borough (generally places similar to a town or city, see https://en.wikipedia.org/wiki/Borough). Some examples: 'Boroughs in California', 'Median Age: Other Boroughs', or 'Ranking by Population for Boroughs in New York'. Please maintain capitalization.",
  },
  Neighborhood: {
    id: "plural_neighborhood",
    defaultMessage: "Neighborhoods",
    description:
      "A label or header for a collection of places of type Neighborhood (generally places within a town or city, see https://en.wikipedia.org/wiki/Neighborhood). Some examples: 'Neighborhoods in California', 'Median Age: Other Neighborhoods', or 'Ranking by Population for Neighborhoods in Paris'. Please maintain capitalization.",
  },
  CensusZipCodeTabulationArea: {
    id: "plural_zip_codes",
    defaultMessage: "Zip Codes",
    description:
      'A collection of ZIP Codes. Some examples: "_ZIP Codes_ in Fremont" or "Median Age: _ZIP Codes_ near 94539", "Median Age: Other _ZIP Codes_" or "Ranking by Number of Employed People for _ZIP Codes_ in Santa Clara County".',
  },
  Place: {
    id: "plural_places",
    defaultMessage: "Places",
    description:
      'General collection of places. It is used when we don"t have a specific place type. Some examples: "_Places_ in Russia" as a header for a section with links to many places contained in Russia, as chart titles, such as "Median Age: _Places_ near Paris" or "Median Age: Other _Places_", or "Ranking for All _Places_ in Russia".',
  },
});

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
  isPlural = false
): string {
  if (placeType.startsWith("AdministrativeArea")) {
    const level = placeType.slice(-1);
    if (!Number.parseInt(level)) {
      if (isPlural) {
        return intl.formatMessage({
          id: "plural_administrative_area",
          defaultMessage: "Administrative Areas",
          description:
            "Label used for a collection of places, of type Administrative Area (an administrative division of generic type, akin to definition here https://en.wikipedia.org/wiki/Administrative_division). An example use is 'Administrative Areas in Europe'. Please maintain capitalization.",
        });
      }
      return intl.formatMessage({
        id: "singular_administrative_area",
        defaultMessage: "Administrative Area",
        description:
          "Label used for a single place, of type Administrative Area (an administrative division of generic type, akin to definition here https://en.wikipedia.org/wiki/Administrative_division). An example use is 'Administrative Area in Europe' to describe 'France'. Please maintain capitalization.",
      });
    }
    if (isPlural) {
      return intl.formatMessage(
        {
          id: "plural_administrative_area_level",
          defaultMessage: "Administrative Area {level} Places",
          description:
            "Label used for a collection of places, of type Administrative Area {level} (an administrative division of certain level, akin to definition here https://en.wikipedia.org/wiki/Administrative_division). {level} are numbers from 1-5. Synonyms for 'places' include locations / towns / cities. An example use is 'Administrative Area 1 Places in Europe'. An equivalent is Administrative Areas of Level 1 in Europe. Please maintain capitalization.",
        },
        { level }
      );
    }
    return intl.formatMessage(
      {
        id: "singular_administrative_area_level",
        defaultMessage: "Administrative Area {level} Place",
        description:
          "Label used for a single place, of type Administrative Area {level} (an administrative division of a certain level, akin to definition here https://en.wikipedia.org/wiki/Administrative_division). {level} are numbers from 1-5. An example use is 'Administrative Area in Europe' to describe 'France'. Please maintain capitalization.",
      },
      { level }
    );
  }

  if (placeType.startsWith("Eurostat")) {
    const level = placeType.slice(-1);
    if (isPlural) {
      return intl.formatMessage(
        {
          id: "plural_eurostat_nuts",
          defaultMessage: "Eurostat NUTS {level} Places",
          description:
            "Label used for a collection of places, of type Eurostat NUTS {level} (an administrative division using the Eurostat nomenclature of a certain level, akin to definition here https://ec.europa.eu/eurostat/web/nuts/background). {level} are numbers from 1-3. An example use is 'Eurostat NUTS 1 Places in Europe' to describe 'France'. Please maintain capitalization.",
        },
        { level }
      );
    }
    return intl.formatMessage(
      {
        id: "singular_eurostat_nuts",
        defaultMessage: "Eurostat NUTS {level} Place",
        description:
          "Label used for a single place, of type Eurostat NUTS {level} (an administrative division using the Eurostat nomenclature of a certain level, akin to definition here https://ec.europa.eu/eurostat/web/nuts/background). {level} are numbers from 1-3. An example use is 'Eurostat NUTS 1 Place in Europe' to describe 'France'. Please maintain capitalization.",
      },
      { level }
    );
  }

  let retMessage = isPlural
    ? pluralPlaceTypeMessages[placeType]
    : singularPlaceTypeMessages[placeType];

  if (!retMessage) {
    retMessage = isPlural
      ? pluralPlaceTypeMessages["Place"]
      : singularPlaceTypeMessages["Place"];
  }
  return intl.formatMessage(retMessage);
}
