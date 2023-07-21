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
}

export function shouldHideCharts(respData: any): boolean {
  const fb = respData["placeFallback"];
  // If there's a valid fallback or if the place source is DEFAULT but not Earth,
  // we should hide.
  return (
    ("origStr" in fb && "newStr" in fb) ||
    (respData["placeSource"] === "DEFAULT" &&
      respData["pastSourceContext"] !== "Earth")
  );
}

const MODES = {
  UNFULFILLED_SV: 1,
  UNRECOGNIZED_SV: 2,
  DEFAULT_PLACE: 3,
  PAST_PLACE: 4,
  PAST_SV: 5,
  PAST_PLACE_AND_SV: 6,
  PAST_COMPARATIVE_PLACES: 7,
  PAST_COMPARATIVE_PLACES_AND_SV: 8,
  FALLBACK_SIMPLE: 9,
  FALLBACK_PAST_PLACE_OR_SV: 10,
};

//
// For more context, refer:
//   https://docs.google.com/document/d/13-1zsYZm_RFkzhKb4GxVy7DQNU8ZiEYZSY8001R-GsU/edit
//
export function NLCommentary(props: NLCommentaryPropType): JSX.Element {
  const isPlacePast = props.chartsData.placeSource === "PAST_QUERY";
  const isPlacePartialPast =
    props.chartsData.placeSource === "PARTIAL_PAST_QUERY";
  const isSvPast = props.chartsData.svSource === "PAST_QUERY";
  const isPlaceCur = props.chartsData.placeSource === "CURRENT_QUERY";
  const isSvCur = props.chartsData.svSource === "CURRENT_QUERY";
  const isSvUnfulfilled = props.chartsData.svSource === "UNFULFILLED";
  const isSvUnrecognized = props.chartsData.svSource === "UNRECOGNIZED";
  const isNonEarthDefaultPlace =
    props.chartsData.placeSource === "DEFAULT" &&
    props.chartsData.pastSourceContext !== "Earth";
  const isFallback = props.chartsData.placeFallback;

  let showMode = null;
  if (isFallback) {
    if (!isSvPast && !isPlacePast) {
      showMode = MODES.FALLBACK_SIMPLE;
    } else {
      showMode = MODES.FALLBACK_PAST_PLACE_OR_SV;
    }
  } else {
    if (isSvUnfulfilled) {
      showMode = MODES.UNFULFILLED_SV;
    } else if (isSvUnrecognized) {
      showMode = MODES.UNRECOGNIZED_SV;
    } else if (isPlacePartialPast) {
      if (isSvPast) {
        showMode = MODES.PAST_COMPARATIVE_PLACES_AND_SV;
      } else {
        showMode = MODES.PAST_COMPARATIVE_PLACES;
      }
    } else if (isPlacePast && isSvCur) {
      showMode = MODES.PAST_PLACE;
    } else if (isPlaceCur && isSvPast) {
      showMode = MODES.PAST_SV;
    } else if (isPlacePast && isSvPast) {
      showMode = MODES.PAST_PLACE_AND_SV;
    } else if (isNonEarthDefaultPlace) {
      // For default place show message only if user hasn't yet clicked on show charts.
      showMode = MODES.DEFAULT_PLACE;
    }
  }
  if (showMode === null) {
    return <></>;
  }
  return (
    <div className="nl-query-info">
      {showMode === MODES.PAST_PLACE && (
        <>
          Could not recognize any place in this query, but here are relevant
          statistics{maybeGetCtx("for")} based on what you previously asked.
        </>
      )}
      {showMode === MODES.PAST_SV && (
        <>
          Could not recognize any topic in this query, but here are relevant
          statistics{maybeGetCtx("for")} based on what you previously asked.
        </>
      )}
      {showMode === MODES.PAST_PLACE_AND_SV && (
        <>
          Could not recognize any place or topic in this query, but here are
          relevant statistics{maybeGetCtx("for")} based on what you previously
          asked.
        </>
      )}
      {showMode === MODES.PAST_COMPARATIVE_PLACES && (
        <>Using places for comparison based on what you previously asked.</>
      )}
      {showMode === MODES.PAST_COMPARATIVE_PLACES_AND_SV && (
        <>
          Using topic and places for comparison based on what you previously
          asked.
        </>
      )}
      {showMode === MODES.UNRECOGNIZED_SV && (
        <>
          Could not recognize any topic from the query, but below are topic
          categories with statistics for {props.chartsData.place.name} that you
          could explore further.
        </>
      )}
      {showMode === MODES.UNFULFILLED_SV && (
        <>
          Sorry, there were no relevant statistics about the topic for{" "}
          {props.chartsData.place.name}. Below are topic categories with
          statistics for {props.chartsData.place.name} that you could explore
          further.
        </>
      )}
      {showMode === MODES.DEFAULT_PLACE && (
        <>
          Could not recognize any place in the query.&nbsp; Displaying relevant
          statistics for the default place{maybeGetCtx("of")}.
        </>
      )}
      {showMode === MODES.FALLBACK_SIMPLE && (
        <>
          Sorry, there were no relevant statistics on this topic for{" "}
          {props.chartsData.placeFallback.origStr}.&nbsp; Displaying results for{" "}
          {props.chartsData.placeFallback.newStr}.
        </>
      )}
      {showMode === MODES.FALLBACK_PAST_PLACE_OR_SV && (
        <>
          Tried looking up relevant statistics for{" "}
          {props.chartsData.placeFallback.origStr} based on your prior queries,
          but found no results.&nbsp; Displaying results for{" "}
          {props.chartsData.placeFallback.newStr}.
        </>
      )}
    </div>
  );

  function maybeGetCtx(connector: string): string {
    if (props.chartsData.pastSourceContext) {
      return " " + connector + " " + props.chartsData.pastSourceContext;
    }
    return "";
  }
}
