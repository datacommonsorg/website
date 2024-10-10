/**
 * Copyright 2022 Google LLC
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
import { ChartSortOption } from "@datacommonsorg/web-components";
import axios from "axios";
import _ from "lodash";
import { defineMessages } from "react-intl";

import { GeoJsonData } from "../chart/types";
import {
  NL_LARGE_TILE_CLASS,
  NL_MED_TILE_CLASS,
  NL_NUM_TILES_SHOWN,
  NL_SMALL_TILE_CLASS,
} from "../constants/app/explore_constants";
import { intl } from "../i18n/i18n";
import { NamedPlace, NamedTypedPlace, StatVarSpec } from "../shared/types";
import {
  ColumnConfig,
  SubjectPageConfig,
} from "../types/subject_page_proto_types";
import { SubjectPageMetadata } from "../types/subject_page_types";
import { getFilteredParentPlaces } from "./app/disaster_dashboard_utils";
import { isNlInterface } from "./explore_utils";

/**
 * Util functions used by subject page components.
 */

const TITLE_MESSAGES = defineMessages({
  titleWithPerCapitaAndDate: {
    defaultMessage: "{variableName} (Per Capita in {date})",
    description:
      "Chart title for a chart with variable values that are per capita for a specific date",
    id: "chart-title-with-per-capita-and-date",
  },
  titleWithPerCapitaOnly: {
    defaultMessage: "{variableName} (Per Capita)",
    description:
      "Chart title for a chart with variable values that are per capita",
    id: "chart-title-with-per-capita-no-date",
  },
  titleWithTwoVariables: {
    defaultMessage: "{variable1} Vs. {variable2}",
    description:
      "Chart title for a chart comparing two different variables. For example, this could be Obesity Rate vs. Median Income.",
    id: "chart-title-with-two-variables",
  },
  titleWithTwoVariablesAndLocation: {
    defaultMessage: "{variable1} Vs. {variable2} in {placeType} of {place}",
    description:
      "Chart title for a chart comparing two different variables, for places of a specific type within a place. For example, this could be Obesity Rate Vs. Income in States of USA, or Housing vs Poverty in Countries of Europe.",
    id: "chart-title-with-two-variables-and-location",
  },
});

/**
 * Gets the relative link using the title of a section on the subject page
 * @param title title of the section to get the relative link for
 */
export function getRelLink(title: string): string {
  return title.replace(/ /g, "-");
}

/**
 * Gets the id for a specific component on a subject page.
 * @param parentId id of the parent component.
 * @param componentIdPrefix prefix for this component's part of the id.
 * @param componentIdx the index of this component within the parent component.
 */
export function getId(
  parentId: string,
  componentIdPrefix: string,
  componentIdx: number
): string {
  return `${parentId}_${componentIdPrefix}_${componentIdx}`;
}

/**
 * Gets the minimum tile index that should be hidden.
 */
export function getMinTileIdxToHide(): number {
  if (isNlInterface()) {
    return NL_NUM_TILES_SHOWN;
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Gets the column width to be used for a list of columns in a block.
 * @param columns list of columns in a block
 */
export function getColumnWidth(columns: ColumnConfig[]): string {
  return columns ? `${(100 / columns.length).toFixed(2)}%` : "0";
}

/**
 * Gets a className that should be included in all the tiles in a column.
 * @param column the column to get the className for
 */
export function getColumnTileClassName(column: ColumnConfig): string {
  let tileClassName = "";
  // HACK for NL tile layout. Regularly, tile size should depend on
  // number of columns in config.
  if (isNlInterface()) {
    if (column.tiles.length > 2) {
      tileClassName = NL_SMALL_TILE_CLASS;
    } else {
      tileClassName =
        column.tiles.length === 1 ? NL_LARGE_TILE_CLASS : NL_MED_TILE_CLASS;
    }
  }
  return tileClassName;
}

/**
 * Get promise for geojson data
 * @param selectedPlace the enclosing place to get geojson data for
 * @param placeType the place type to get geojson data for
 * @param parentPlaces parent places of the selected place
 * @param apiRoot the stem of the API endpoint
 */
export function fetchGeoJsonData(
  selectedPlace: NamedTypedPlace,
  placeType: string,
  parentPlaces?: NamedPlace[],
  apiRoot?: string
): Promise<GeoJsonData> {
  let enclosingPlace = selectedPlace.dcid;
  let enclosedPlaceType = placeType;
  if (
    !enclosedPlaceType &&
    !_.isEmpty(parentPlaces) &&
    !_.isEmpty(selectedPlace.types)
  ) {
    // set enclosing place to be the parent place and the enclosed place type to
    // be the place type of the selected place.
    enclosingPlace = parentPlaces[0].dcid;
    enclosedPlaceType = selectedPlace.types[0];
  }
  return axios
    .get<GeoJsonData>(`${apiRoot || ""}/api/choropleth/geojson`, {
      params: {
        placeDcid: enclosingPlace,
        placeType: enclosedPlaceType,
      },
    })
    .then((resp) => resp.data as GeoJsonData)
    .catch(() => {
      return {
        type: "FeatureCollection",
        features: [],
        properties: {
          currentGeo: enclosingPlace,
        },
      };
    });
}

/**
 * Extract data from the DOM inserted using the subject_page_content macro.
 */
export function loadSubjectPageMetadataFromPage(): SubjectPageMetadata {
  const placeEl = document.getElementById("place");
  if (!placeEl) {
    return;
  }

  const placeDcid = placeEl.dataset.dcid;
  const placeName = placeEl.dataset.name || placeDcid;
  const placeTypes = [placeEl.dataset.type] || [];
  const place = { dcid: placeDcid, name: placeName, types: placeTypes };
  const parentPlaces = JSON.parse(placeEl.dataset.parents);
  const pageConfig = JSON.parse(
    document.getElementById("dashboard-config").dataset.config
  );
  const childPlaces = JSON.parse(placeEl.dataset.children);
  return {
    pageConfig,
    place,
    parentPlaces: getFilteredParentPlaces(parentPlaces, place),
    childPlaces,
  };
}

/**
 * Convert input to bar tile's "sort" prop into a SortType
 * Used to type cast SCREAMING_SNAKE_CASE from subject page configs
 */
export function convertToSortType(str: string): ChartSortOption {
  switch (str) {
    case "ASCENDING":
      return "ascending" as ChartSortOption;
    case "ASCENDING_POPULATION":
      return "ascendingPopulation" as ChartSortOption;
    case "DESCENDING":
      return "descending" as ChartSortOption;
    default:
      // Default to descending population to match behavior of bar tiles
      return "descendingPopulation" as ChartSortOption;
  }
}
/**
 * Trim subject page config based on the url parameter.
 *
 * @param pageConfig A subject page config
 * @param numBlocks Total number blocks to keep
 * @returns subject config with trimmed category and blocks
 */
export function trimCategory(
  pageConfig: SubjectPageConfig,
  numBlocks: number
): SubjectPageConfig {
  if (numBlocks) {
    let count = numBlocks;
    const categories = [];
    for (const category of pageConfig.categories) {
      if (count == 0) {
        break;
      }
      if (category.blocks.length >= count) {
        category.blocks = category.blocks.slice(0, count);
      }
      categories.push(category);
      count -= category.blocks.length;
    }
    pageConfig.categories = categories;
  }
  return pageConfig;
}

/**
 * Add "Per Capita" to a chart title.
 *
 * If the "date" replacement string is present, will add "Per Capita in" inside
 * the same parentheses as the date. If date is not present, will add
 * "(Per Capita)" to the end of the title.
 *
 * Assumes chart titles have the format <StatVarName> (${date}). Used for
 * updating the chart titles when the "See per capita" checkbox is checked.
 *
 * @param title title of the chart to edit
 * @param dateString format of the date replacement string to look for
 * @returns new chart title that includes the string "Per Capita"
 */
export function addPerCapitaToTitle(
  title: string,
  dateString = "date"
): string {
  const dateStringPattern = `(\${${dateString}})`;
  if (title && title.includes(dateStringPattern)) {
    // title includes date
    // extract part before ${date} to pass into formatMessage
    const statVarName = title.slice(0, title.indexOf(dateStringPattern));
    return intl.formatMessage(TITLE_MESSAGES.titleWithPerCapitaAndDate, {
      date: `\${${dateString}}`,
      variableName: statVarName,
    });
  }
  // title does not include date, just add (Per Capita) to the end
  return intl.formatMessage(TITLE_MESSAGES.titleWithPerCapitaOnly, {
    variableName: title,
  });
}

/**
 * Add "Per Capita" to a chart title that compares two stat vars
 *
 * Adds "Per Capita" to the variables that have a denom in their spec. If xDate
 * or yDate replacement strings are present, will add "Per Capita" inside the
 * same parentheses as the corresponding variable date. If xDate or yDate is
 * not present, will add "(Per Capita)" after the variable name instead.
 *
 * Assumes the first stat var in statVarSpecs is shown on the y-axis, and
 * the second stat var in statVarSpecs is shown on the x-axis. Assumes the
 * format of the title originally is "<y-axis stat var> Vs. <x-axis stat var> in
 * <placeType> of <parentPlace>" or "<y-axis stat var> Vs. <x-axis stat var>".
 *
 * @param title title of chart to edit
 * @param statVarSpecs stat vars being plotted by the chart
 * @returns new chart title that includes "Per Capita" for vars with denom
 */
export function addPerCapitaToVersusTitle(
  title: string,
  statVarSpecs: StatVarSpec[]
): string {
  // Split title into constituent parts via regex groups:
  //   xVar -> x-axis stat var
  //   yVar -> y-axis stat var
  //   vs -> " Vs. " or " vs. " or " Vs " or " vs "
  //   location -> "in <placeType> of <place>", if present
  const regex =
    /^(?<yVar>.*?)(?<vs>\s[Vv]s\.?\s)(?<xVar>.*?)(?<location>\s+in\s(?<placeType>.*?)\sof\s(?<parentPlace>.*?))?$/;
  const titleParts = title.match(regex).groups;
  if (titleParts) {
    // Edit xVar and yVar parts to include "Per Capita"
    if (statVarSpecs?.[0].denom) {
      titleParts.yVar = addPerCapitaToTitle(titleParts.yVar, "yDate");
    }
    if (statVarSpecs?.[1].denom) {
      titleParts.xVar = addPerCapitaToTitle(titleParts.xVar, "xDate");
    }
    if (titleParts.placeType && titleParts.parentPlace) {
      // include location in title if "in placeType of place" was found
      return intl.formatMessage(
        TITLE_MESSAGES.titleWithTwoVariablesAndLocation,
        {
          place: titleParts.parentPlace,
          placeType: titleParts.placeType,
          variable1: titleParts.yVar,
          variable2: titleParts.xVar,
        }
      );
    } else {
      // otherwise, just return "y-axis stat var Vs. x-axis stat var"
      return intl.formatMessage(TITLE_MESSAGES.titleWithTwoVariables, {
        variable1: titleParts.yVar,
        variable2: titleParts.xVar,
      });
    }
  }
  return title;
}
