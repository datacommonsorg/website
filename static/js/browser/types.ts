/**
 * Copyright 2021 Google LLC
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

import _ from "lodash";

/**
 * Types shared across different components of graph browser.
 */

export interface ArcValue {
  text: string;
  dcid?: string;
}

export interface InArcValue {
  provenanceId: string;
  dcid: string;
  name?: string;
}

export enum PageDisplayType {
  PLACE_STAT_VAR,
  GENERAL,
  BIOLOGICAL_SPECIMEN,
  STAT_VAR_OBSERVATION,
}

/**
 * Mapping for nodeTypes that need to render a special page type.
 * More mappings may be added as more display types are added.
 */
const NODE_TYPE_TO_PAGE_DISPLAY_TYPE = {
  BiologicalSpecimen: PageDisplayType.BIOLOGICAL_SPECIMEN,
  StatVarObservation: PageDisplayType.STAT_VAR_OBSERVATION,
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
  for (const nodeType in NODE_TYPE_TO_PAGE_DISPLAY_TYPE) {
    if (listOfTypes.includes(nodeType)) {
      return NODE_TYPE_TO_PAGE_DISPLAY_TYPE[nodeType];
    }
  }
  return PageDisplayType.GENERAL;
}
