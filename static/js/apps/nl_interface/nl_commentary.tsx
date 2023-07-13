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
 * Commentary for NL results.
 */

import React from "react";

import { SearchResult } from "../../types/app/nl_interface_types";

interface NLCommentaryPropType {
  chartsData: SearchResult;
  hideCharts: boolean;
  setHideCharts: (v: boolean) => void;
}

export function shouldHideCharts(respData: any): boolean {
  const fb = respData["placeFallback"];
  // If there's a valid fallback or if the place source is DEFAULT but not Earth,
  // we should hide.
  return (
    ("origStr" in fb && "newStr" in fb) ||
    (respData["placeSource"] == "DEFAULT" &&
      respData["pastSourceContext"] != "Earth")
  );
}

//
// For more context, refer:
//   https://docs.google.com/document/d/13-1zsYZm_RFkzhKb4GxVy7DQNU8ZiEYZSY8001R-GsU/edit
//
export function NLCommentary(props: NLCommentaryPropType): JSX.Element {
  return (
    <>
      {!props.chartsData.placeFallback &&
        ((props.chartsData.placeSource === "PAST_QUERY" &&
          props.chartsData.svSource === "CURRENT_QUERY") ||
          (props.chartsData.placeSource === "CURRENT_QUERY" &&
            props.chartsData.svSource === "PAST_QUERY") ||
          (props.chartsData.placeSource === "PAST_QUERY" &&
            props.chartsData.svSource === "PAST_QUERY")) && (
          <div className="nl-query-info">
            Could not recognize any{" "}
            {props.chartsData.placeSource === "CURRENT_QUERY" && (
              <span>topic</span>
            )}
            {props.chartsData.svSource === "CURRENT_QUERY" && (
              <span>place</span>
            )}
            {props.chartsData.svSource === "PAST_QUERY" &&
              props.chartsData.placeSource === "PAST_QUERY" && (
                <span>place or topic</span>
              )}{" "}
            in this query, but here are relevant statistics{" "}
            {props.chartsData.pastSourceContext && (
              <span>for {props.chartsData.pastSourceContext} </span>
            )}
            based on what you previously asked.
          </div>
        )}
      {!props.chartsData.placeFallback &&
        props.chartsData.placeSource === "PARTIAL_PAST_QUERY" && (
          <div className="nl-query-info">
            Using{" "}
            {props.chartsData.svSource === "PAST_QUERY" && (
              <span>topic and </span>
            )}
            places for comparison based on what you previously asked.
          </div>
        )}
      {!props.chartsData.placeFallback &&
        props.chartsData.svSource === "UNRECOGNIZED" && (
          <div className="nl-query-info">
            Could not recognize any topic from the query, but below are topic
            categories with statistics for {props.chartsData.place.name} that
            you could explore further.
          </div>
        )}
      {!props.chartsData.placeFallback &&
        props.chartsData.svSource === "UNFULFILLED" && (
          <div className="nl-query-info">
            Sorry, there were no relevant statistics about the topic for{" "}
            {props.chartsData.place.name}. Below are topic categories with
            statistics for {props.chartsData.place.name} that you could explore
            further.
          </div>
        )}
      {!props.chartsData.placeFallback &&
        props.hideCharts &&
        props.chartsData.placeSource === "DEFAULT" &&
        props.chartsData.pastSourceContext !== "Earth" && (
          <div className="nl-query-info">
            Could not recognize any place in the query.&nbsp; Would you like to
            see{" "}
            <span
              className="nl-query-info-click"
              onClick={() => {
                props.setHideCharts(false);
              }}
            >
              relevant statistics for the default place
              {props.chartsData.pastSourceContext && (
                <span> &quot;{props.chartsData.pastSourceContext}&quot;</span>
              )}
            </span>{" "}
            instead?
          </div>
        )}
      {props.chartsData.placeFallback && props.hideCharts && (
        <div className="nl-query-info">
          {props.chartsData.placeSource !== "PAST_QUERY" &&
            props.chartsData.svSource !== "PAST_QUERY" && (
              <span>
                Sorry, there were no relevant statistics on this topic for
                &quot;{props.chartsData.placeFallback.origStr}&quot;.
              </span>
            )}
          {(props.chartsData.placeSource === "PAST_QUERY" ||
            props.chartsData.svSource === "PAST_QUERY") && (
            <span>
              Tried looking up relevant statistics for &quot;
              {props.chartsData.placeFallback.origStr}&quot; based on your prior
              queries, but found no results.
            </span>
          )}
          <span>
            &nbsp; Would you like to see{" "}
            <span
              className="nl-query-info-click"
              onClick={() => {
                props.setHideCharts(false);
              }}
            >
              results for &quot;{props.chartsData.placeFallback.newStr}&quot;
            </span>{" "}
            instead?
          </span>
        </div>
      )}
    </>
  );
}
