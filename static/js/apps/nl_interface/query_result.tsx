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
import React, { createRef, memo, useEffect, useRef, useState } from "react";
import { Container } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SVG_CHART_HEIGHT } from "../../constants/app/nl_interface_constants";
import { NlSessionContext } from "../../shared/context";
import {
  CHART_FEEDBACK_SENTIMENT,
  getFeedbackLink,
} from "../../utils/nl_interface_utils";
import { useStoreActions, useStoreState } from "./app_state";
import { DebugInfo } from "./debug_info";
import { NLCommentary } from "./nl_commentary";

export interface QueryResultProps {
  queryIdx: number;
  nlQueryId: string;
}

export const QueryResult = memo(function QueryResult(
  props: QueryResultProps
): JSX.Element {
  const currentNlQueryContextId = useStoreState(
    (s) => s.config.currentNlQueryContextId
  );
  const prevCurrentNlQueryContextId = useRef<string>(currentNlQueryContextId);
  const numQueries = useStoreState(
    (s) => s.nlQueryContexts[currentNlQueryContextId].nlQueryIds.length
  );
  const { nlQueryId } = props;
  const nlQuery = useStoreState((s) => s.nlQueries[nlQueryId]);
  const updateNlQuery = useStoreActions((a) => a.updateNlQuery);
  const scrollRef = createRef<HTMLDivElement>();

  /**
   * Scroll this query result into view once it starts loading
   */
  useEffect(() => {
    if (nlQuery.isLoading) {
      scrollRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });
    }
  }, [nlQuery.isLoading, scrollRef]);

  /**
   * When changing query contexts, scroll the last query result into view
   */
  useEffect(() => {
    if (currentNlQueryContextId === prevCurrentNlQueryContextId.current) {
      return;
    }
    if (props.queryIdx !== numQueries - 1) {
      return;
    }
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  }, [currentNlQueryContextId, prevCurrentNlQueryContextId, scrollRef]);

  const feedbackLink = getFeedbackLink(nlQuery.query || "", nlQuery.debugData);
  return (
    <>
      <div className="nl-query" ref={scrollRef}>
        <Container>
          <div className="nl-user-query">
            <div className="nl-user-query-icon">
              <span className="material-icons">search_icon</span>
            </div>
            <div className="nl-user-query-text">{nlQuery.query}</div>
          </div>
        </Container>
      </div>
      <div className="nl-result">
        <Container className="feedback-link">
          <a href={feedbackLink} target="_blank" rel="noreferrer">
            Feedback
          </a>
          {nlQuery.chartData && nlQuery.chartData.sessionId && (
            <span
              className={`feedback-emoji ${
                nlQuery.feedbackGiven ? "feedback-emoji-dim" : ""
              }`}
              onClick={() => {
                onEmojiClick(CHART_FEEDBACK_SENTIMENT.WARNING);
              }}
            >
              &#9888;
            </span>
          )}
        </Container>
        <Container className="nl-result-content">
          {nlQuery.debugData && (
            <DebugInfo
              debugData={nlQuery.debugData}
              chartsData={nlQuery.chartData}
            ></DebugInfo>
          )}
          {nlQuery.chartData && <NLCommentary chartsData={nlQuery.chartData} />}
          {nlQuery.chartData && nlQuery.chartData.config && (
            <NlSessionContext.Provider value={nlQuery.chartData.sessionId}>
              <SubjectPageMainPane
                id={`pg${props.queryIdx}`}
                place={nlQuery.chartData.place}
                pageConfig={nlQuery.chartData.config}
                svgChartHeight={SVG_CHART_HEIGHT}
                showExploreMore={true}
              />
            </NlSessionContext.Provider>
          )}
          {nlQuery.errorMsg && (
            <div className="nl-query-error">
              <p>
                {nlQuery.errorMsg}
                {redirectToGoogle() && (
                  <>
                    Would you like to try{" "}
                    <a href={`https://google.com/?q=${nlQuery.query}`}>
                      searching on Google
                    </a>
                    ?
                  </>
                )}
              </p>
            </div>
          )}
          {nlQuery.isLoading && (
            <div className="dot-loading-stage">
              <div className="dot-flashing"></div>
            </div>
          )}
        </Container>
      </div>
    </>
  );

  function onEmojiClick(sentiment: string): void {
    if (nlQuery.feedbackGiven) {
      return;
    }
    updateNlQuery({
      id: nlQuery.id,
      feedbackGiven: true,
    });
    axios.post("/api/nl/feedback", {
      sessionId: nlQuery.chartData.sessionId,
      feedbackData: {
        queryId: props.queryIdx,
        sentiment,
      },
    });
  }

  function redirectToGoogle(): boolean {
    if (!nlQuery.errorMsg) {
      return false;
    }
    return (
      nlQuery.errorMsg.includes("Sorry") || nlQuery.errorMsg.includes("sorry")
    );
  }
});
