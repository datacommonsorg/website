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
  PointAllApiResponse,
  PointApiResponse,
  SeriesAllApiResponse,
  SeriesApiResponse,
  StatMetadata,
} from "../shared/stat_types";
import { FacetMetadata } from "../types/facet_metadata";
import { stringifyFn } from "./axios";
import { getUnit } from "./stat_metadata_utils";

const EMPTY_UNIT = "EMPTY";
const FACET_WITHIN_ENTITY = "";

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
        if (_.isEmpty(obs)) {
          return;
        }
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
  alignedVariables?: string[][],
  facetIds?: string[]
): Promise<PointApiResponse> {
  const params = { childType, date, parentEntity, variables };
  if (facetIds) {
    params["facetIds"] = facetIds;
  }
  return axios
    .get<PointApiResponse>(`${apiRoot || ""}/api/observations/point/within`, {
      params,
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return getProcessedPointResponse(resp.data, alignedVariables);
    });
}

/**
 * Gets the data from /api/observations/series endpoint.
 * @param apiRoot api root
 * @param entities list of enitites to get data for
 * @param variables list of variables to get data for
 */
export async function getSeries(
  apiRoot: string,
  entities: string[],
  variables: string[],
  facetIds?: string[],
  highlightFacet?: FacetMetadata
): Promise<SeriesApiResponse> {
  console.log("Entities: ", JSON.stringify(highlightFacet));
  const params = { entities, variables };
  if (facetIds) {
    params["facetIds"] = facetIds;
  } else if (highlightFacet) {
    const newFacetId = await getFacets(apiRoot, entities, variables).then(
      (resp) => {
        const svDcid = Object.keys(resp)[0];
        const facets = resp[svDcid];
        console.log("Facets: ", facets);
        // Iterate through all the facets, and find a match on the importName property.
        for (const [facetId, f] of Object.entries(facets)) {
          console.log("FacetId: " + facetId + " Facet: " + JSON.stringify(f));
          if (
            !_.isEmpty(highlightFacet.importName) &&
            highlightFacet.importName !== f.importName
          ) {
            console.log(
              "Diff in the importName importName" +
                f.importName +
                " vs " +
                highlightFacet.importName
            );
            continue;
          }
          if (
            !_.isEmpty(highlightFacet.measurementMethod) &&
            highlightFacet.measurementMethod !== f.measurementMethod
          ) {
            console.log(
              "Diff in the measurement method" +
                f.measurementMethod +
                " vs " +
                highlightFacet.measurementMethod
            );
            continue;
          }
          if (
            !_.isEmpty(highlightFacet.unit) &&
            highlightFacet.unit !== f.unit
          ) {
            console.log(
              "Diff in the unit" + f.unit + " vs " + highlightFacet.unit
            );
            continue;
          }
          console.log("Found a match");
          return facetId;
        }
        return null;
      }
    );
    if (newFacetId) {
      params["facetIds"] = [newFacetId];
    }
  }
  //EurostatData_Demographic_Balance_Crude_Rates, WikidataPopulation, OECDRegionalDemography_Population
  return axios
    .post(`${apiRoot || ""}/api/observations/series`, params)
    .then((resp) => resp.data);
}

/**
 * Gets the data from /api/observations/series/within endpoint.
 * @param apiRoot api root
 * @param parentEntity parent place to get the data for
 * @param childType place type to get the data for
 * @param variables variables to get data for
 * @returns
 */
export function getSeriesWithin(
  apiRoot: string,
  parentEntity: string,
  childType: string,
  variables: string[],
  facetIds?: string[]
): Promise<SeriesApiResponse> {
  const params = { parentEntity, childType, variables };
  if (facetIds) {
    params["facetIds"] = facetIds;
  }
  return axios
    .get(`${apiRoot || ""}/api/observations/series/within`, {
      params,
      paramsSerializer: stringifyFn,
    })
    .then((resp) => resp.data);
}

export interface FacetResponse {
  [svDcid: string]: {
    [facetId: string]: StatMetadata;
  };
}

/**
 * Gets all the available facets for each variable given the parent, child type
 * and date.
 * @param apiRoot  api root
 * @param parentEntity parent place to get available facets for
 * @param childType place type to get available facets for
 * @param variables variables to get available facets for
 * @param date date to get available facets for
 */
export function getFacetsWithin(
  apiRoot: string,
  parentEntity: string,
  childType: string,
  variables: string[],
  date?: string
): Promise<FacetResponse> {
  return axios
    .get<PointAllApiResponse>(`${apiRoot || ""}/api/facets/within`, {
      params: { parentEntity, childType, variables, date: date || "LATEST" },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      const respData = resp.data;
      const result = {};
      for (const svDcid of Object.keys(respData.data)) {
        result[svDcid] = {};
        if (_.isEmpty(respData.data[svDcid][FACET_WITHIN_ENTITY])) {
          continue;
        }
        respData.data[svDcid][FACET_WITHIN_ENTITY].forEach((obs) => {
          if (obs.facet && respData.facets[obs.facet]) {
            result[svDcid][obs.facet] = respData.facets[obs.facet];
          }
        });
      }
      return result;
    });
}

/**
 * Gets the available facets for each variable given a list of entities.
 * @param apiRoot api root
 * @param entities entities to get available facets for
 * @param variables variables to get available facets for
 */
export function getFacets(
  apiRoot: string,
  entities: string[],
  variables: string[]
): Promise<FacetResponse> {
  return axios
    .get<SeriesAllApiResponse>(`${apiRoot || ""}/api/facets`, {
      params: { entities, variables },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      const respData = resp.data;
      const result = {};
      for (const svDcid of Object.keys(respData.data)) {
        result[svDcid] = {};
        if (_.isEmpty(respData.data[svDcid])) {
          continue;
        }
        for (const placeDcid of Object.keys(respData.data[svDcid])) {
          if (_.isEmpty(respData.data[svDcid][placeDcid])) {
            continue;
          }
          respData.data[svDcid][placeDcid].forEach((series) => {
            if (series.facet && respData.facets[series.facet]) {
              result[svDcid][series.facet] = respData.facets[series.facet];
            }
          });
        }
      }
      return result;
    });
}
