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
 * Gets the data from /api/observations/point endpoint
 * @param apiRoot api root
 * @param entities list of entitites to get data for
 * @param variables list of variables to get data for
 * @param highlightFacet a single facet (given by the facet keys) that is
 *        used to indicate the facet to be used in this fetch.
 * @returns The Facet ID matching the highlight facet
 *          or null if no matching facet is found.
 */
async function selectFacet(
  apiRoot: string,
  entities: string[],
  variables: string[],
  highlightFacet?: FacetMetadata
): Promise<string[] | null> {
  if (!highlightFacet) {
    return [];
  }
  const facetsResponse = await getFacets(apiRoot, entities, variables);
  console.log("all facets in selectFacet: ", facetsResponse);
  for (const svDcid of Object.keys(facetsResponse)) {
    const facets = facetsResponse[svDcid];
    for (const [facetId, f] of Object.entries(facets)) {
      if (
        (!_.isEmpty(highlightFacet.importName) &&
          highlightFacet.importName !== f.importName) ||
        (!_.isEmpty(highlightFacet.measurementMethod) &&
          highlightFacet.measurementMethod !== f.measurementMethod) ||
        (!_.isEmpty(highlightFacet.unit) && highlightFacet.unit !== f.unit) ||
        (!_.isEmpty(highlightFacet.observationPeriod) &&
          highlightFacet.observationPeriod !== f.observationPeriod) ||
        (!_.isEmpty(highlightFacet.scalingFactor) &&
          highlightFacet.scalingFactor !== f.scalingFactor)
      ) {
        continue;
      }
      return [facetId];
    }
  }

  return [];
}

/**
 * Gets the data from /api/observations/point endpoint
 * @param apiRoot api root
 * @param entities list of entitites to get data for
 * @param variables list of variables to get data for
 * @param highlightFacet a single facet (given by the facet keys) that is
 *        used to indicate the facet to be used in this fetch.
 * @returns The Facet ID matching the highlight facet
 *          or null if no matching facet is found.
 */
export async function selectFacetsForDenominator(
  apiRoot: string,
  entities: string[],
  variables: string[],
  highlightFacet?: FacetMetadata
): Promise<string[] | null> {
  if (!highlightFacet) {
    return [];
  }
  const facetsResponse = await getFacets(apiRoot, entities, variables);
  console.log("all facets in selectFacet: ", facetsResponse);
  const allValidFacets = [];
  for (const svDcid of Object.keys(facetsResponse)) {
    const facets = facetsResponse[svDcid];
    for (const [facetId, f] of Object.entries(facets)) {
      if (
        !_.isEmpty(highlightFacet.importName) &&
        highlightFacet.importName !== f.importName
      ) {
        continue;
      }
      allValidFacets.push(facetId);
    }
  }

  return allValidFacets;
}

/**
 * Fetches all facets that match the given variables /api/facets/within,
 * and match the given highlightFacet.
 * Has more lax requirements, meaning we get all facets with the same import name, but
 * not measurement method or other facet attributes.
 * @param apiRoot api root
 * @param parentEntity parent place to get available facets for
 * @param childType place type to get available facets for
 * @param variables list of variables to get data for
 * @param highlightFacet a single facet (given by the facet keys) that is
 *        used to indicate the facet to be used in this fetch.
 * @returns The Facet ID matching the highlight facet
 *          or null if no matching facet is found.
 */
export async function selectFacetsWithinForDenominator(
  apiRoot: string,
  parentEntity: string,
  childType: string,
  variables: string[],
  date: string,
  highlightFacet?: FacetMetadata
): Promise<string[] | null> {
  if (!highlightFacet) {
    return [];
  }
  const facetsResponse = await getFacetsWithin(
    apiRoot,
    parentEntity,
    childType,
    variables,
    date ?? "LATEST"
  );

  const allValidFacets = [];
  console.log("all facets to select from: ", facetsResponse);
  for (const svDcid of Object.keys(facetsResponse)) {
    const facets = facetsResponse[svDcid];
    for (const [facetId, f] of Object.entries(facets)) {
      if (
        !_.isEmpty(highlightFacet.importName) &&
        highlightFacet.importName !== f.importName
      ) {
        continue;
      }
      allValidFacets.push(facetId);
    }
  }

  return allValidFacets;
}

/**
 * Gets and processes the data from /api/observations/point endpoint
 * @param apiRoot api root
 * @param entities list of entitites to get data for
 * @param variables list of variables to get data for
 * @param date date to get the data for
 * @param alignedVariables groups of variables that should have the same unit
 * @param highlightFacet a single facet (given by the facet keys) that is
 *        used to indicate the facet to be used in this fetch.
 * @param facetIds an array of facet ids that if given, will be used in
 *        the fetch. This is an alternative way to specify the facets to
 *        complement highlightFacet.
 */
export function getPoint(
  apiRoot: string,
  entities: string[],
  variables: string[],
  date: string,
  alignedVariables?: string[][],
  highlightFacet?: FacetMetadata,
  facetIds?: string[]
): Promise<PointApiResponse> {
  const facetPromise = !_.isEmpty(facetIds)
    ? Promise.resolve(facetIds)
    : selectFacet(apiRoot, entities, variables, highlightFacet);

  return facetPromise.then((resolvedFacetIds) => {
    const params: Record<string, unknown> = { date, entities, variables };
    if (!_.isEmpty(resolvedFacetIds)) {
      params["facetId"] = resolvedFacetIds;
    }
    return axios
      .get<PointApiResponse>(`${apiRoot || ""}/api/observations/point`, {
        params,
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        return getProcessedPointResponse(resp.data, alignedVariables);
      });
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
 * @param facetIds an array of facet ids that if given, will be used in
 *        the fetch. This is an alternative way to specify the facets to
 *        complement highlightFacet, and will take priority if both are given.
 * @param highlightFacet a single facet (given by the facet keys) that is
 *        used to indicate the facet to be used in this fetch.
 */
export function getPointWithin(
  apiRoot: string,
  childType: string,
  parentEntity: string,
  variables: string[],
  date: string,
  alignedVariables?: string[][],
  facetIds?: string[],
  highlightFacet?: FacetMetadata
): Promise<PointApiResponse> {
  const facetPromise = !_.isEmpty(facetIds)
    ? Promise.resolve(facetIds)
    : selectFacetsWithinForDenominator(
        apiRoot,
        parentEntity,
        childType,
        variables,
        date,
        highlightFacet
      );
  return facetPromise.then((resolvedFacetIds) => {
    const params = { childType, date, parentEntity, variables };
    if (!_.isEmpty(resolvedFacetIds)) {
      params["facetIds"] = resolvedFacetIds;
    }
    return axios
      .get<PointApiResponse>(`${apiRoot || ""}/api/observations/point/within`, {
        params,
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        return getProcessedPointResponse(resp.data, alignedVariables);
      });
  });
}

/**
 * Gets the data from /api/observations/series endpoint.
 *
 * Note that for now there are two ways to fetch a single facet, either via facetIds or given a highlightFacet. Only one of the two should be provided.
 * @param apiRoot api root
 * @param entities list of enitites to get data for
 * @param variables list of variables to get data for
 * @param facetIds list of facet ids to get data for
 * @param highlightFacet the facet to highlight
 * @returns The data for the given entities and variables, matching the provided facet if applicable.
 */
export function getSeries(
  apiRoot: string,
  entities: string[],
  variables: string[],
  facetIds?: string[],
  highlightFacet?: FacetMetadata
): Promise<SeriesApiResponse> {
  const params = { entities, variables };
  return Promise.resolve(
    selectFacet(apiRoot, entities, variables, highlightFacet)
  ).then((resolvedFacetIds) => {
    if (!_.isEmpty(facetIds)) {
      params["facetIds"] = facetIds;
    } else if (!_.isEmpty(resolvedFacetIds)) {
      params["facetIds"] = resolvedFacetIds;
    }

    console.log(
      "resolvedFacetIs in getseries: ",
      highlightFacet,
      resolvedFacetIds
    );

    return axios
      .post(`${apiRoot || ""}/api/observations/series`, params)
      .then((resp) => resp.data);
  });
}

/**
 * Gets the data from /api/observations/series/within endpoint.
 * @param apiRoot api root
 * @param parentEntity parent place to get the data for
 * @param childType place type to get the data for
 * @param variables variables to get data for
 * @param facetIds an array of facet ids that if given, will be used in
 *        the fetch.
 * @returns
 */
export function getSeriesWithin(
  apiRoot: string,
  parentEntity: string,
  childType: string,
  variables: string[],
  facetIds?: string[],
  highlightFacet?: FacetMetadata
): Promise<SeriesApiResponse> {
  const facetPromise = !_.isEmpty(facetIds)
    ? Promise.resolve(facetIds)
    : selectFacetsWithinForDenominator(
        apiRoot,
        parentEntity,
        childType,
        variables,
        null,
        highlightFacet
      );
  return facetPromise.then((resolvedFacetIds) => {
    console.log(
      "resolvedFacetIs in getseriesWithin: ",
      highlightFacet,
      resolvedFacetIds
    );
    const params = { parentEntity, childType, variables };
    if (!_.isEmpty(resolvedFacetIds)) {
      params["facetIds"] = resolvedFacetIds;
    }
    return axios
      .get(`${apiRoot || ""}/api/observations/series/within`, {
        params,
        paramsSerializer: stringifyFn,
      })
      .then((resp) => resp.data);
  });
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
