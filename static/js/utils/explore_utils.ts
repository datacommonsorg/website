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

import { SubjectPageMetadata } from "../types/subject_page_types";

/**
 * Utils used for the nl interface
 */

// Param prefixes found when following the instructions here to get a prefilled
// link: https://support.google.com/docs/answer/2839588?hl=en&ref_topic=6063592#zippy=%2Csend-a-form-with-pre-filled-answers
const QUERY_PARAM_PREFIX = "&entry.1606762999=";
const SOURCE_PARAM_PREFIX = "&entry.1274521740=";
const VERSION_PARAM_PREFIX = "&entry.137463700=";
const QUERY_CHAIN_PARAM_PREFIX = "&entry.2133108642=";
const DEBUG_INFO_PARAM_PREFIX = "&entry.1116448950=";
const EXPLORE_CONTEXT_PARAM_PREFIX = "&entry.1142623554=";

export const CHART_FEEDBACK_SENTIMENT = {
  // The chart is relevant for the query
  THUMBS_UP: "THUMBS_UP",
  // The chart is not relevant for the query
  THUMBS_DOWN: "THUMBS_DOWN",
  // Somewhat relevant but not quite right (eg wrong place type)
  WARNING: "WARNING",
  // Chart should be promoted up
  PROMOTE: "PROMOTE",
  // Chart should be demoted
  DEMOTE: "DEMOTE",
  // This is an embarrassing result
  FACE_PALM: "FACE_PALM",
};

interface ChartId {
  queryIdx: number;
  categoryIdx: number;
  blockIdx: number;
  columnIdx: number;
  tileIdx: number;
}

// Given the dom ID of a chart, extract its relevant indexes in
// the query session and SubjectPageConfig proto.
// TODO: Add an integration test to make sure the ID format doesn't change.
export function getNlChartId(idStr: string): ChartId {
  // Format: pg0_cat_1_blk_2_col_3_tile_4
  let numbers: number[] = idStr.match(/\d+/g)?.map(Number);
  if (numbers.length !== 5) {
    numbers = [-1, -1, -1, -1, -1];
  }
  const chartId: ChartId = {
    queryIdx: numbers[0],
    categoryIdx: numbers[1],
    blockIdx: numbers[2],
    columnIdx: numbers[3],
    tileIdx: numbers[4],
  };
  return chartId;
}

export function isNlInterface(): boolean {
  // Returns true if currently on the NL page.
  const path = window.location.pathname;
  return (
    path === "/nl" ||
    path === "/nl/" ||
    path === "/explore" ||
    path === "/explore/"
  );
}

/**
 * Get the link to the feedback form for the nl interface
 * @param query the query the user is submitting feedback for
 * @param debugData the debug data from server response
 */
export function getFeedbackLink(
  formUrl: string,
  query: string,
  debugData: any,
  exploreContext?: any
): string {
  let debugInfo = {};
  let queryChain = [];
  if (debugData) {
    const svScores = [];
    if (debugData["sv_matching"]) {
      const svs = Object.values(debugData["sv_matching"]["SV"]);
      const scores = Object.values(debugData["sv_matching"]["CosineScore"]);
      if (svs.length === scores.length) {
        svs.forEach((sv, i) => {
          svScores.push({ sv, score: scores[i] });
        });
      }
    }
    debugInfo = {
      executionStatus: debugData["status"],
      blocked: debugData["blocked"] || false,
      placesDetected: debugData["places_detected"],
      mainPlaceDCID: debugData["main_place_dcid"],
      mainPlaceName: debugData["main_place_name"],
      queryForVariableDetection: debugData["query_with_places_removed"],
      rankingClassification: debugData["ranking_classification"],
      generalClassification: debugData["general_classification"],
      superlativeClassification: debugData["superlative_classification"],
      timeDeltaClassification: debugData["time_delta_classification"],
      comparisonClassification: debugData["comparison_classification"],
      containedInClassification: debugData["contained_in_classification"],
      correlationClassification: debugData["correlation_classification"],
      eventClassification: debugData["event_classification"],
      svScores,
      processedFulfillmentTypes: debugData["counters"]
        ? debugData["counters"]["processed_fulfillment_types"]
        : [],
    };
    if (Array.isArray(debugData["context"])) {
      queryChain = debugData["context"].map(
        (utterance) => utterance["query"] || ""
      );
    }
    queryChain = queryChain.reverse();
  }
  const sourceUrl = window.location.toString().split("#")[0];
  const queryChainUrl = queryChain.length
    ? `(${sourceUrl}#q=${queryChain.join(";")}&a=true)`
    : "";
  const paramMap = {
    [QUERY_PARAM_PREFIX]: query,
    [SOURCE_PARAM_PREFIX]: sourceUrl,
    [VERSION_PARAM_PREFIX]:
      document.getElementById("metadata").dataset.websiteHash || "",
    [QUERY_CHAIN_PARAM_PREFIX]: JSON.stringify(queryChain) + queryChainUrl,
    [DEBUG_INFO_PARAM_PREFIX]: JSON.stringify(debugInfo),
  };
  if (exploreContext) {
    paramMap[EXPLORE_CONTEXT_PARAM_PREFIX] = JSON.stringify(exploreContext);
  }
  let link = formUrl;
  Object.keys(paramMap).forEach((prefix) => {
    const value = paramMap[prefix];
    if (value) {
      // Values need to be encoded here to differentiate between a url value and
      // part of the prefill link URL. e.g., non encoded "&" is processed by
      // forms as joining two separate prefill values
      link += `${prefix}${encodeURI(value)
        .replaceAll("&", "%26")
        .replaceAll("#", "%23")}`;
    }
  });
  return link;
}

// Whether or not there is only a single place overview tile in the page
// metadata.
export function isPlaceOverviewOnly(
  pageMetadata: SubjectPageMetadata
): boolean {
  // false if no page metadata or config or categories
  if (
    !pageMetadata ||
    !pageMetadata.pageConfig ||
    !pageMetadata.pageConfig.categories
  ) {
    return false;
  }
  const categories = pageMetadata.pageConfig.categories;
  // False if there is more than 1 tile
  if (
    categories.length !== 1 ||
    categories[0].blocks.length !== 1 ||
    categories[0].blocks[0].columns.length !== 1 ||
    categories[0].blocks[0].columns[0].tiles.length !== 1
  ) {
    return false;
  }
  // True only if the one tile is of type PLACE_OVERVIEW
  return categories[0].blocks[0].columns[0].tiles[0].type === "PLACE_OVERVIEW";
}
