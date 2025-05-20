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

/**
 * URL related helpers shared across components.
 */

import queryString from "query-string";

import { URL_HASH_PARAMS } from "../constants/app/explore_constants";
import { FacetMetadata } from "../types/facet_metadata";

/**
 * Returns token for URL param.
 * @param param URL param
 * @returns Corresponding token
 */
export function getUrlToken(param: string): string {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  return urlParams.get(param);
}

/**
 * Returns token for URL param, or the given default.
 * @param param URL param
 * @def def default value
 * @returns Corresponding token
 */
export function getUrlTokenOrDefault(param: string, def: string): string {
  const res = getUrlToken(param);
  if (res === null) {
    return def;
  }
  return res;
}

/**
 * Gets the updated URL hash param given new param values
 * @param params Map of param to new value.
 */
export function getUpdatedHash(
  params: Record<string, string | string[]>
): string {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  for (const param in params) {
    if (!params[param]) {
      urlParams.delete(param);
      continue;
    }
    if (Array.isArray(params[param])) {
      urlParams.delete(param);
      (<string[]>params[param]).forEach((v) => urlParams.append(param, v));
    } else {
      urlParams.set(param, <string>params[param]);
    }
  }
  return urlParams.toString();
}

/**
 * Updates URL hash param with given value.
 * @param params Map of param to new value.
 */
export function updateHash(params: Record<string, string | string[]>): void {
  window.location.hash = getUpdatedHash(params);
}

/**
 * Returns a cleaned url host that can be used for creating URLs to DC tools.
 * @param apiRoot API root to clean.
 * @returns URL hostname that can be appended to.
 */
export function apiRootToHostname(apiRoot?: string): string {
  return apiRoot ? apiRoot.replace(/\/$/, "") : "";
}

export function getSingleParam(input: string | string[]): string {
  // If the input is an array, convert it to a single string
  if (Array.isArray(input)) {
    return input[0];
  }
  if (!input) {
    // Return empty instead of letting it be undefined.
    return "";
  }
  return input;
}

/**
 * Extracts all the const parameters from the URL hash parameters within the Explore.
 * @param hashParams parameters.
 * @returns string array of all parrams.
 */
export interface UrlHashParams {
  query: string;
  place: string;
  topic: string;
  statVars: string;
  dc: string;
  idx: string;
  disableExploreMore: string;
  detector: string;
  testMode: string;
  i18n: string;
  includeStopWords: string;
  defaultPlace: string;
  mode: string;
  reranker: string;
  maxTopics: string;
  maxTopicSvs: string;
  maxCharts: string;
  chartType: string;
  facetMetadata?: FacetMetadata;
}

export function extractFacetMetadataUrlHashParams(
  hashParams: queryString.ParsedQuery<string>
): FacetMetadata | undefined {
  const importName = getSingleParam(hashParams[URL_HASH_PARAMS.IMPORT_NAME]);
  const measurementMethod = getSingleParam(
    hashParams[URL_HASH_PARAMS.MEASUREMENT_METHOD]
  );
  const observationPeriod = getSingleParam(
    hashParams[URL_HASH_PARAMS.OBSERVATION_PERIOD]
  );
  const scalingFactor = getSingleParam(
    hashParams[URL_HASH_PARAMS.SCALING_FACTOR]
  );
  const unit = getSingleParam(hashParams[URL_HASH_PARAMS.UNIT]);

  if (
    importName ||
    measurementMethod ||
    observationPeriod ||
    scalingFactor ||
    unit
  ) {
    return {
      importName,
      measurementMethod,
      observationPeriod,
      scalingFactor: Number(scalingFactor),
      unit,
    };
  }
  return undefined;
}

export function extractUrlHashParams(
  hashParams: queryString.ParsedQuery<string>
): UrlHashParams {
  const query =
    getSingleParam(hashParams[URL_HASH_PARAMS.QUERY]) ||
    getSingleParam(hashParams[URL_HASH_PARAMS.DEPRECATED_QUERY]);
  const place = getSingleParam(hashParams[URL_HASH_PARAMS.PLACE]);
  const topic = getSingleParam(hashParams[URL_HASH_PARAMS.TOPIC]);
  const statVars = getSingleParam(hashParams[URL_HASH_PARAMS.STAT_VAR]);
  const dc = getSingleParam(hashParams[URL_HASH_PARAMS.DC]);
  const idx = getSingleParam(hashParams[URL_HASH_PARAMS.IDX]);
  const disableExploreMore = getSingleParam(
    hashParams[URL_HASH_PARAMS.DISABLE_EXPLORE_MORE]
  );
  const detector = getSingleParam(hashParams[URL_HASH_PARAMS.DETECTOR]);
  const testMode = getSingleParam(hashParams[URL_HASH_PARAMS.TEST_MODE]);
  const i18n = getSingleParam(hashParams[URL_HASH_PARAMS.I18N]);
  const includeStopWords = getSingleParam(
    hashParams[URL_HASH_PARAMS.INCLUDE_STOP_WORDS]
  );
  const defaultPlace = getSingleParam(
    hashParams[URL_HASH_PARAMS.DEFAULT_PLACE]
  );
  const mode = getSingleParam(hashParams[URL_HASH_PARAMS.MODE]);
  const reranker = getSingleParam(hashParams[URL_HASH_PARAMS.RERANKER]);
  const maxTopics = getSingleParam(hashParams[URL_HASH_PARAMS.MAX_TOPICS]);
  const maxTopicSvs = getSingleParam(hashParams[URL_HASH_PARAMS.MAX_TOPIC_SVS]);
  const maxCharts = getSingleParam(hashParams[URL_HASH_PARAMS.MAX_CHARTS]);
  const chartType = getSingleParam(hashParams[URL_HASH_PARAMS.CHART_TYPE]);
  const facetMetadata = extractFacetMetadataUrlHashParams(hashParams);

  return {
    query,
    place,
    topic,
    statVars,
    dc,
    idx,
    disableExploreMore,
    detector,
    testMode,
    i18n,
    includeStopWords,
    defaultPlace,
    mode,
    reranker,
    maxTopics,
    maxTopicSvs,
    maxCharts,
    chartType,
    facetMetadata,
  };
}
