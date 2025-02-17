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

import { defineMessages } from "react-intl";

// Strings to use in place page
export const singularPlaceTypeMessages = defineMessages({
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

export const pluralPlaceTypeMessages = defineMessages({
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

export const pageMessages = defineMessages({
  KnowledgeGraph: {
    id: "knowledge_graph",
    defaultMessage: "Knowledge Graph",
    description: "Link to the Knowledge Graph for the current place",
  },
  RelevantTopics: {
    id: "relevant_topics",
    defaultMessage: "Relevant topics",
    description:
      "Header text for the Relevant topics tab section for the current place. Example topics tabs include Crime, Demographics, Economics, Education, Energy, Environment, Equity, Health, and Housing.",
  },
  SummaryOverview: {
    id: "summary_overview",
    defaultMessage: "Summary overview",
    description:
      "Header text for the Summary overview section for the current place. Summary overview will include a plain-text description of the place, a map, and a table of key statistics.",
  },
  KeyDemographics: {
    id: "key_demographics",
    defaultMessage: "Key demographics",
    description:
      "Header text for the Key demographics section for the current place. Section will include a table of key demographic statistics for the place.",
  },
  MoreCharts: {
    id: "more_charts_link",
    defaultMessage: "More charts",
    description:
      "Link text to show additional charts for the given chart category section for the current place.",
  },
  placesInPlace: {
    id: "child_places_menu-places_in_place",
    defaultMessage: "Places in {placeName}",
    description:
      'Used for the child places navigation sidebar. Shows a list of place contained in the current place. For example, the sidebar for the Austria place page shows links to child places under the header "Places in {Austria}".',
  },
  placeTypeInPlaces: {
    id: "place_type_in_places",
    defaultMessage: "{placeType} in",
    description:
      'Used for the place page subheader. Shows the place type of the current place, and a list of all parent places. For example, for California, it shows "State in {USA, North America, World}".',
  },
});
