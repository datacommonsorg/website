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
import {
  BlockConfig,
  Chart,
  Place,
  PlaceChartsApiResponse,
} from "@datacommonsorg/client/dist/data_commons_web_client_types";
import _ from "lodash";
import { defineMessages } from "react-intl";

import { intl, localizeLink } from "../i18n/i18n";
import { USA_PLACE_DCID } from "../shared/constants";
import { NamedTypedPlace, StatVarSpec } from "../shared/types";
import {
  BlockConfig as SubjectPageBlockConfig,
  CategoryConfig,
  SubjectPageConfig,
  TileConfig,
} from "../types/subject_page_proto_types";

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

/**
 * An ordered list of place types for which to highlight child places.
 */
const PARENT_PLACE_TYPES_TO_HIGHLIGHT = [
  "County",
  "AdministrativeArea2",
  "EurostatNUTS2",
  "State",
  "AdministrativeArea1",
  "EurostatNUTS1",
  "Country",
  "Continent",
];

const DATE_STR = "(${date})";

/**
 * Returns the stat var key for a chart.
 *
 * A stat var key is a unique identifier for a statistical variable for the
 * given chart, including its DCID, denominator, log, scaling, and unit.
 *
 * @param chart The chart object
 * @param variableDcid The variable DCID
 * @param denom The denominator DCID
 * @returns The stat var key
 */
function getStatVarKey(
  block: BlockConfig,
  variableDcid: string,
  denom?: string
): string {
  return `${variableDcid}_denom_${denom}_log_${false}_scaling_${
    block.scaling
  }_unit_${block.unit}`;
}

/**
 * Selects the appropriate place to return given the placeScope and parent places.
 * @param placeScope string representing scope of places we want to show
 * @param parentPlaces All possible parent places to choose from
 * @returns string for the selected place dcid or undefined.
 */
function getPlaceOverride(placeScope: string, parentPlaces: Place[]): string {
  if (!["PEER_PLACES_WITHIN_PARENT", "SIMILAR_PLACES"].includes(placeScope)) {
    return "";
  }

  const placeOverride = parentPlaces.find((place) => {
    const lowestIndex = Math.min(
      ...place.types
        .map((type) => PARENT_PLACE_TYPES_TO_HIGHLIGHT.indexOf(type))
        .filter((index) => index !== -1)
    );
    return lowestIndex !== Infinity;
  });
  return placeOverride ? placeOverride.dcid : undefined;
}

/**
 * Select the place type to highlight from provided list.
 * @param placeTypes list of possible place types
 * @returns the selected place_type.
 */
function firstPlaceTypeToHighlight(placeTypes: string[]): string {
  // Find the most important type from the place's types.
  let highlightedType = "";
  let lowestIndex = Infinity; // Start with a very high index

  for (const currentType of placeTypes) {
    const currentIndex = PARENT_PLACE_TYPES_TO_HIGHLIGHT.indexOf(currentType);

    if (currentIndex !== -1 && currentIndex < lowestIndex) {
      highlightedType = currentType;
      lowestIndex = currentIndex;
    }
  }

  return highlightedType;
}

/**
 * Selects the appropriate enclosed place type to return given the placeScope and parent places.
 * @param placeScope string representing scope of places we want to show
 * @param place Current place
 * @returns string for the selected enclosed place type.
 */
function getEnclosedPlaceTypeOverride(
  placeScope: string,
  place: Place
): string {
  switch (placeScope) {
    case "CHILD_PLACES":
      if (place.dcid == "Earth") {
        // We do not have continent level data, so default to country.
        return "Country";
      }
      return "";
    case "SIMILAR_PLACES":
    case "PEER_PLACES_WITHIN_PARENT":
      return firstPlaceTypeToHighlight(place.types);
    default:
      return "";
  }
}

/**
 * Creates a href for a place page category.
 * @param category The category to create a href for.
 * @param forceDevPlaces Whether to force dev places.
 * @param place The place to create a href for.
 * @returns The href for the place page category.
 */
export function createPlacePageCategoryHref(
  category: string,
  forceDevPlaces: boolean,
  place: NamedTypedPlace
): string {
  const href = `/place/${place.dcid}`;
  const params = new URLSearchParams();
  const isOverview = category === "Overview";

  if (!isOverview) {
    params.set("category", category);
  }
  if (forceDevPlaces) {
    params.set("force_dev_places", "true");
  }
  return params.size > 0 ? `${href}?${params.toString()}` : href;
}

/**
 * Helper to process the dev Place page API response
 * Converts the API response from getPlaceCharts into a SubjectPageConfig object.
 * Groups charts by category and creates the necessary configuration objects for
 * rendering the subject page.
 *
 * @param placeChartsApiResponse The API response containing chart data
 * @returns A SubjectPageConfig object with categories, tiles, and stat var specs
 */
export function placeChartsApiResponsesToPageConfig(
  placeChartsApiResponse: PlaceChartsApiResponse,
  parentPlaces: Place[],
  peersWithinParent: string[],
  place: Place,
  isOverview: boolean,
  forceDevPlaces: boolean
): SubjectPageConfig {
  const blocksByCategory = _.groupBy(
    placeChartsApiResponse.blocks,
    (item) => item.category
  );

  const categoryNameToTranslatedName = _.fromPairs(
    placeChartsApiResponse.categories.map((category) => [
      category.name,
      category.translatedName,
    ])
  );

  const categoryConfig: CategoryConfig[] = Object.keys(blocksByCategory).map(
    (categoryName) => {
      const blocks = blocksByCategory[categoryName];
      const newblocks: SubjectPageBlockConfig[] = [];
      const statVarSpec: Record<string, StatVarSpec> = {};

      blocks.forEach((block: BlockConfig) => {
        let blockTitle;
        const tiles = [];
        block.charts.forEach((chart: Chart) => {
          if (!blockTitle) {
            blockTitle = block.title;
          }

          const title = block.title;
          const tileConfig: TileConfig = {
            /** Highlight charts use title as description */
            description: title,
            title: title + " " + DATE_STR,
            type: chart.type,

            statVarKey: block.statisticalVariableDcids.map(
              (variableDcid, variableIdx) => {
                const denom =
                  block.denominator &&
                  block.denominator.length ===
                    block.statisticalVariableDcids.length
                    ? block.denominator[variableIdx]
                    : undefined;
                return getStatVarKey(block, variableDcid, denom);
              }
            ),
          };

          const placeOverride: string = getPlaceOverride(
            block.placeScope,
            parentPlaces
          );
          if (placeOverride) {
            tileConfig["placeDcidOverride"] = placeOverride;
          }

          const lowestIndexType = getEnclosedPlaceTypeOverride(
            block.placeScope,
            place
          );
          if (lowestIndexType) {
            tileConfig.enclosedPlaceTypeOverride = lowestIndexType;
          }

          let maxPlacesCount = 5;
          if (tileConfig.type === "RANKING") {
            maxPlacesCount = chart.maxPlaces ? chart.maxPlaces : 5;
            tileConfig.rankingTileSpec = {
              showHighest: false,
              showLowest: false,
              showHighestLowest: true,
              showMultiColumn: false,
              rankingCount: maxPlacesCount,
            };
          } else if (tileConfig.type === "BAR") {
            maxPlacesCount = chart.maxPlaces ? chart.maxPlaces : 15;
            tileConfig.barTileSpec = {
              maxPlaces: maxPlacesCount,
              sort: "DESCENDING",
            };
          }

          if (block.placeScope === "PEER_PLACES_WITHIN_PARENT") {
            // Pass peersWithinParents in comparisonPlaces with the right number of places.
            tileConfig.comparisonPlaces = [place.dcid].concat(
              peersWithinParent.slice(
                0,
                Math.min(maxPlacesCount - 1, peersWithinParent.length)
              )
            );
          }
          tiles.push(tileConfig);
        });

        blocks.forEach((block) => {
          block.statisticalVariableDcids
            .flat()
            .forEach((variableDcid, variableIdx) => {
              const denom =
                block.denominator &&
                block.denominator.length ===
                  block.statisticalVariableDcids.length
                  ? block.denominator[variableIdx]
                  : undefined;
              const statVarKey = getStatVarKey(block, variableDcid, denom);
              statVarSpec[statVarKey] = {
                denom: undefined,
                log: false,
                scaling: block.scaling,
                noPerCapita: false,
                statVar: variableDcid,
                unit: block.unit,
              };
            });
        });

        newblocks.push({
          title: blockTitle,
          denom: block.denominator?.length > 0 ? block.denominator[0] : "",
          startWithDenom: false,
          columns: [{ tiles }],
        });
      });

      const category: CategoryConfig = {
        blocks: newblocks,
        statVarSpec,
        title: categoryNameToTranslatedName[categoryName] || categoryName,
      };
      if (isOverview) {
        category.url = localizeLink(
          createPlacePageCategoryHref(categoryName, forceDevPlaces, place)
        );
        category.linkText = intl.formatMessage(pageMessages.MoreCharts);
      }
      return category;
    }
  );

  const pageConfig: SubjectPageConfig = {
    metadata: undefined,
    categories: categoryConfig,
  };
  return pageConfig;
}

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

export const pageMessages = defineMessages({
  KnowledgeGraph: {
    id: "knowledge_graph",
    defaultMessage: "Knowledge Graph",
    description: "Link to the Knowledge Graph for the current place",
  },
  RelevantTopics: {
    id: "relevant_topics",
    defaultMessage: "Relevant Topics",
    description:
      "Header text for the Relevant Topics tab section for the current place. Example topics tabs include Crime, Demographics, Economics, Education, Energy, Environment, Equity, Health, and Housing.",
  },
  SummaryOverview: {
    id: "summary_overview",
    defaultMessage: "Summary Overview",
    description:
      "Header text for the Summary Overview section for the current place. Summary overview will include a plain-text description of the place, a map, and a table of key statistics.",
  },
  MoreCharts: {
    id: "more_charts",
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
