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
 * Utils used for the nl interface
 */

const FEEDBACK_LINK =
  "https://docs.google.com/forms/d/e/1FAIpQLSfqndIayVhN1bN5oeZT0Te-MhhBMBR1hn97Lgr77QTOpga8Iw/viewform?usp=pp_url";
// Param prefixes found when following the instructions here to get a prefilled
// link: https://support.google.com/docs/answer/2839588?hl=en&ref_topic=6063592#zippy=%2Csend-a-form-with-pre-filled-answers
const QUERY_PARAM_PREFIX = "&entry.1322830239=";
const SOURCE_PARAM_PREFIX = "&entry.1070482700=";
const VERSION_PARAM_PREFIX = "&entry.1420739572=";
const QUERY_CHAIN_PARAM_PREFIX = "&entry.1836374054=";
const DEBUG_INFO_PARAM_PREFIX = "&entry.1280679042=";

export function isNlInterface(): boolean {
  // Returns true if currently on the NL page.
  const path = window.location.pathname;
  return path === "/nl" || path === "/nl/";
}

/**
 * Get the link to the feedback form for the nl interface
 * @param query the query the user is submitting feedback for
 * @param debugData the debug data from server response
 */
export function getFeedbackLink(query: string, debugData: any): string {
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
      placesDetected: debugData["places_detected"],
      mainPlaceDCID: debugData["main_place_dcid"],
      mainPlaceName: debugData["main_place_name"],
      queryForVariableDetection: debugData["query_with_places_removed"],
      rankingClassification: debugData["ranking_classification"],
      overviewClassification: debugData["overview_classification"],
      sizeTypeClassification: debugData["size_type_classification"],
      timeDeltaClassification: debugData["time_delta_classification"],
      comparisonClassification: debugData["comparison_classification"],
      containedInClassification: debugData["contained_in_classification"],
      correlationClassification: debugData["correlation_classification"],
      eventClassification: debugData["event_classification"],
      svScores,
      processedFulfillmentTypes: debugData["counters"] ? debugData["counters"]["processed_fulfillment_types"] : []
    };
    if (Array.isArray(debugData["data_spec"])) {
      queryChain = debugData["data_spec"].map(
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
  let link = FEEDBACK_LINK;
  Object.keys(paramMap).forEach((prefix) => {
    const value = paramMap[prefix];
    if (value) {
      // Values need to be encoded here to differentiate between a url value and
      // part of the prefill link URL. e.g., non encoded "&" is processed by
      // forms as joining two separate prefill values
      link += `${prefix}${encodeURI(value).replaceAll("&", "%26").replaceAll("#", "%23")}`;
    }
  });
  return link;
}
