/**
 * Copyright 2023 Google LLC
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
 * Util functions for fetching data.
 */

import axios from "axios";
import _ from "lodash";

import {
  Observation,
  PointApiResponse,
  StatMetadata,
} from "../shared/stat_types";
import { stringifyFn } from "./axios";
import { getUnit } from "./stat_metadata_utils";

const EMPTY_UNIT = "EMPTY";

/**
 * Gets the best unit
 * @param unit2Count a map of unit to count of occurences of that unit
 */
export function getBestUnit(unit2Count: Record<string, number>): string {
  const rankedUnits = Object.keys(unit2Count).sort((a, b) => {
    const countDiff = unit2Count[b] - unit2Count[a];
    if (countDiff !== 0) {
      return countDiff;
    }
    return a < b ? -1 : 1;
  });
  if (_.isEmpty(rankedUnits)) {
    return EMPTY_UNIT;
  }
  return rankedUnits[0];
}

// Gets the unit for an observation
function getObsUnit(
  facets: Record<string, StatMetadata>,
  obs: Observation
): string {
  let unit = obs.unitDisplayName || EMPTY_UNIT;
  const obsFacet = facets[obs.facet];
  if (obsFacet) {
    unit = getUnit(obsFacet) || unit;
  }
  return unit;
}

/**
 * Gets the processed point response where all the data for aligned variables
 * have the same unit & for every other variable, the data for all entities
 * have the same unit
 * @param resp point api response to process
 * @param alignedVariables groups of variables that should have the same unit
 */
function getProcessedPointResponse(
  resp: PointApiResponse,
  alignedVariables?: string[][]
): PointApiResponse {
  const processedResp = {
    facets: resp.facets,
    data: {},
  };
  const variableGroups = alignedVariables || [];
  const groupedSvs = new Set(variableGroups.flat());
  for (const sv of Object.keys(resp.data)) {
    if (!groupedSvs.has(sv)) {
      variableGroups.push([sv]);
    }
  }
  for (const varGroup of variableGroups) {
    const unit2Count = {};
    for (const variable of varGroup) {
      const entityObs = resp.data[variable];
      Object.values(entityObs).forEach((obs) => {
        const unit = getObsUnit(resp.facets, obs);
        if (!unit2Count[unit]) {
          unit2Count[unit] = 0;
        }
        unit2Count[unit]++;
      });
    }
    const chosenUnit = getBestUnit(unit2Count);
    for (const variable of varGroup) {
      processedResp.data[variable] = {};
      const entityObs = resp.data[variable];
      Object.keys(entityObs).forEach((entity) => {
        const obs = entityObs[entity];
        const unit = getObsUnit(resp.facets, obs);
        if (unit === chosenUnit) {
          processedResp.data[variable][entity] = obs;
        }
      });
    }
  }
  return processedResp;
}

/**
 * Gets and processes the data from /api/observations/point endpoint
 * @param apiRoot api root
 * @param entities list of entitites to get data for
 * @param variables list of variables to get data for
 * @param date date to get the data for
 * @param alignedVariables groups of variables that should have the same unit
 */
export function getPoint(
  apiRoot: string,
  entities: string[],
  variables: string[],
  date: string,
  alignedVariables?: string[][]
): Promise<PointApiResponse> {
  return axios
    .get<PointApiResponse>(`${apiRoot || ""}/api/observations/point`, {
      params: { date, entities, variables },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return getProcessedPointResponse(resp.data, alignedVariables);
    });
}

/**
 * Gets and processes the data from /api/observations/point/within endpoint
 * @param apiRoot api root
 * @param childType type of entity to get data for
 * @param parentEntity the parent entity of the entities to get data for
 * @param variables list of variables to get data for
 * @param date date to get the data for
 * @param alignedVariables groups of variables that should have the same unit
 */
export function getPointWithin(
  apiRoot: string,
  childType: string,
  parentEntity: string,
  variables: string[],
  date: string,
  alignedVariables?: string[][]
): Promise<PointApiResponse> {
  return axios
    .get<PointApiResponse>(`${apiRoot || ""}/api/observations/point/within`, {
      params: { childType, date, parentEntity, variables },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return getProcessedPointResponse(resp.data, alignedVariables);
    });
}
