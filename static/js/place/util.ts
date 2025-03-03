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

import { intl, localizeLink } from "../i18n/i18n";
import {
  pageMessages,
  pluralPlaceTypeMessages,
  singularPlaceTypeMessages,
} from "../i18n/i18n_place_messages";
import { USA_PLACE_DCID } from "../shared/constants";
import { NamedTypedPlace, StatVarSpec } from "../shared/types";
import {
  BlockConfig as SubjectPageBlockConfig,
  CategoryConfig,
  SubjectPageConfig,
  TileConfig,
} from "../types/subject_page_proto_types";
import { isMobileByWidth } from "../shared/util";
import { Theme } from "../theme/types";

const DEFAULT_BAR_CHART_ITEMS_MOBILE = 8;
const DEFAULT_BAR_CHART_ITEMS = 15;

/**
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
  forceDevPlaces: boolean,
  theme: Theme
): SubjectPageConfig {
  const blocksByCategory = _.groupBy(
    placeChartsApiResponse.blocks,
    (item) => item.category
  );

  const categoryNameToCategory = _.fromPairs(
    placeChartsApiResponse.categories.map((category) => [
      category.name,
      category,
    ])
  );

  const categoryConfig: CategoryConfig[] = Object.keys(blocksByCategory).map(
    (categoryName) => {
      const blocks = blocksByCategory[categoryName];
      const newblocks: SubjectPageBlockConfig[] = [];
      const statVarSpec: Record<string, StatVarSpec> = {};
      const defaultBarChartItems = isMobileByWidth(theme)
        ? DEFAULT_BAR_CHART_ITEMS_MOBILE
        : DEFAULT_BAR_CHART_ITEMS;

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
            maxPlacesCount = chart.maxPlaces
              ? chart.maxPlaces
              : defaultBarChartItems;
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
        title:
          categoryNameToCategory[categoryName].translatedName || categoryName,
      };
      if (isOverview && categoryNameToCategory[categoryName].hasMoreCharts) {
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
