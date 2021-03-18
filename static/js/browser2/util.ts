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

/**
 * Functions and types shared across different components of graph browser.
 */

import _ from "lodash";

export interface SourceSeries {
  provenanceDomain: string;
  val: { [key: string]: string };
  importName?: string;
  measurementMethod?: string;
  observationPeriod?: string;
  scalingFactor?: string;
  unit?: string;
}

export enum PageDisplayType {
  PLACE_STAT_VAR,
  PLACE_WITH_WEATHER_INFO,
  GENERAL,
  BIOLOGICAL_SPECIMEN,
}

/**
 * Mapping for nodeTypes that need to render a special page type.
 * More mappings may be added as more display types are added.
 */
export const nodeTypeToPageDisplayTypeMapping = {
  CensusZipCodeTabulationArea: PageDisplayType.PLACE_WITH_WEATHER_INFO,
  City: PageDisplayType.PLACE_WITH_WEATHER_INFO,
  BiologicalSpecimen: PageDisplayType.BIOLOGICAL_SPECIMEN,
};

/**
 * Returns the type of page to display.
 * @param listOfTypes list of types that comes from the kg.
 * @param statVarId either a statVarId or empty string. If this string is not empty,
 * the page display type is PLACE_STAT_VAR.
 */
export function getPageDisplayType(
  listOfTypes: string[],
  statVarId: string
): PageDisplayType {
  if (!_.isEmpty(statVarId)) {
    return PageDisplayType.PLACE_STAT_VAR;
  }
  for (const nodeType in nodeTypeToPageDisplayTypeMapping) {
    if (listOfTypes.includes(nodeType)) {
      return nodeTypeToPageDisplayTypeMapping[nodeType];
    }
  }
  return PageDisplayType.GENERAL;
}

/**
 * Removes the loading message on the browser page if it is present.
 */
export function removeLoadingMessage(): void {
  // TODO (chejennifer): better way to handle loading
  const loadingElem = document.getElementById("page-loading");
  if (loadingElem) {
    loadingElem.style.display = "none";
  }
}
