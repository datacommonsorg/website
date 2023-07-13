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
 * A single query for the NL interface
 */

import axios from "axios";
import _ from "lodash";
import React, { createRef, memo, useEffect, useState } from "react";
import { Container } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SVG_CHART_HEIGHT } from "../../constants/app/nl_interface_constants";
import { NlSessionContext } from "../../shared/context";
import { SearchResult } from "../../types/app/nl_interface_types";
import {
  CHART_FEEDBACK_SENTIMENT,
  getFeedbackLink,
} from "../../utils/nl_interface_utils";
import { DebugInfo } from "./debug_info";
import { NLCommentary, shouldHideCharts } from "./nl_commentary";

export interface QueryResultProps {
  query: string;
  indexType: string;
  detector: string;
  queryIdx: number;
  contextHistory: any[];
  addContextCallback: (any, number) => void;
  showData: boolean;
  demoMode: boolean;
}

export const QueryResult = memo(function QueryResult(
  props: QueryResultProps
): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [debugData, setDebugData] = useState<any>();
  const [hideCharts, setHideCharts] = useState<boolean>(false);
  const scrollRef = createRef<HTMLDivElement>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [isEmojiClicked, setIsEmojiClicked] = useState(false);

  useEffect(() => {
    // Scroll to the top (assuming this is the last query to render, and other queries are memoized).
    // HACK: use a longer timeout to correct scroll errors after charts have rendered.
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    fetchData(props.query);
  }, [props.query]);

  function fetchData(query: string): void {
    setIsLoading(true);
    let indexParam = "";
    if (props.indexType) {
      indexParam = "&idx=" + props.indexType;
    }

    let detectorParam = "";
    if (props.detector) {
      detectorParam = "&detector=" + props.detector;
    }
    axios
      .post(`/api/nl/data?q=${query}${indexParam}${detectorParam}`, {
        contextHistory: props.contextHistory,
      })
      .then((resp) => {
        if (
          resp.data["context"] === undefined ||
          resp.data["config"] === undefined
        ) {
          setIsLoading(false);
          props.addContextCallback(undefined, props.queryIdx);
          return;
        }
        const context: any = resp.data["context"];
        props.addContextCallback(context, props.queryIdx);

        // Filter out empty categories.
        const categories = _.get(resp, ["data", "config", "categories"], []);
        _.remove(categories, (c) => _.isEmpty(c));
        if (categories.length > 0) {
          let mainPlace = {};
          mainPlace = resp.data["place"];
          const fb = resp.data["placeFallback"];
          if (shouldHideCharts(resp.data)) {
            setHideCharts(true);
          }
          setChartsData({
            place: {
              dcid: mainPlace["dcid"],
              name: mainPlace["name"],
              types: [mainPlace["place_type"]],
            },
            config: resp.data["config"],
            sessionId:
              !props.demoMode && "session" in resp.data
                ? resp.data["session"]["id"]
                : "",
            svSource: resp.data["svSource"],
            placeSource: resp.data["placeSource"],
            pastSourceContext: resp.data["pastSourceContext"],
            placeFallback:
              "origStr" in fb && "newStr" in fb
                ? {
                    origStr: fb["origStr"],
                    newStr: fb["newStr"],
                  }
                : null,
          });
        } else {
          // If there was no place recognized, we might end up with 0
          // categories.  Check if that's the case, and provide a different
          // error message.
          if ("placeSource" in resp.data && resp.data["placeSource"]) {
            setErrorMsg("Could not recognize any place in the query!");
          } else {
            setErrorMsg("Sorry, we couldn't answer your question.");
          }
        }
        const debugData = resp.data["debug"];
        if (debugData !== undefined) {
          debugData["context"] = context;
          setDebugData(debugData);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        props.addContextCallback(undefined, props.queryIdx);
        console.error("Error fetching data for", props.query, error);
        setIsLoading(false);
        setErrorMsg("Sorry, we didn’t understand your question.");
      });
  }
  const feedbackLink = getFeedbackLink(props.query || "", debugData);
  return (
    <>
      <div className="nl-query" ref={scrollRef}>
        <Container>
          <h2>Q: {props.query}</h2>
        </Container>
      </div>
      <div className="nl-result">
        <Container className="feedback-link">
          <a href={feedbackLink} target="_blank" rel="noreferrer">
            Feedback
          </a>
          {chartsData && chartsData.sessionId && (
            <span
              className={`feedback-emoji ${
                isEmojiClicked ? "feedback-emoji-dim" : ""
              }`}
              onClick={() => {
                onEmojiClick(CHART_FEEDBACK_SENTIMENT.WARNING);
              }}
            >
              &nbsp;&nbsp;&#9888;
            </span>
          )}
        </Container>
        <Container>
          {debugData && (
            <DebugInfo
              debugData={debugData}
              chartsData={chartsData}
            ></DebugInfo>
          )}
          {chartsData && (
            <NLCommentary
              chartsData={chartsData}
              hideCharts={hideCharts}
              setHideCharts={setHideCharts}
            />
          )}
          {chartsData && chartsData.config && !hideCharts && (
            <NlSessionContext.Provider value={chartsData.sessionId}>
              <SubjectPageMainPane
                id={`pg${props.queryIdx}`}
                place={chartsData.place}
                pageConfig={chartsData.config}
                svgChartHeight={SVG_CHART_HEIGHT}
                showData={props.showData}
              />
            </NlSessionContext.Provider>
          )}
          {errorMsg && (
            <div className="nl-query-error">
              <p>
                {errorMsg} Would you like to try{" "}
                <a href={`https://google.com/?q=${props.query}`}>
                  searching on Google
                </a>
                ?
              </p>
            </div>
          )}
          {isLoading && (
            <div className="dot-loading-stage">
              <div className="dot-flashing"></div>
            </div>
          )}
        </Container>
      </div>
    </>
  );

  function onEmojiClick(sentiment: string): void {
    if (isEmojiClicked) {
      return;
    }
    setIsEmojiClicked(true);
    axios.post("/api/nl/feedback", {
      sessionId: chartsData.sessionId,
      feedbackData: {
        queryId: props.queryIdx,
        sentiment,
      },
    });
  }
});
