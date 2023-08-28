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
import React, { createRef, memo, useEffect, useRef } from "react";
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

const FEEDBACK_LINK =
  "https://docs.google.com/forms/d/e/1FAIpQLSe9SG0hOfrK7UBiOkQbK0ieC0yP5v-8gnQKU3mSIyzqdv6WaQ/viewform?usp=pp_url";

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
  }, [
    currentNlQueryContextId,
    prevCurrentNlQueryContextId,
    scrollRef,
    numQueries,
    props.queryIdx,
  ]);

  const feedbackLink = getFeedbackLink(
    FEEDBACK_LINK,
    nlQuery.query || "",
    nlQuery.debugData
  );
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
          {nlQuery.queryResult && nlQuery.queryResult.sessionId && (
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
              queryResult={nlQuery.queryResult}
            ></DebugInfo>
          )}
          {nlQuery.userMessage && (
            <div className="nl-query-info">{nlQuery.userMessage}</div>
          )}
          {nlQuery.queryResult && nlQuery.queryResult.config && (
            <NlSessionContext.Provider value={nlQuery.queryResult.sessionId}>
              <SubjectPageMainPane
                id={`pg${props.queryIdx}`}
                place={nlQuery.queryResult.place}
                pageConfig={nlQuery.queryResult.config}
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
      feedbackGiven: true,
      id: nlQuery.id,
    });
    axios.post("/api/nl/feedback", {
      sessionId: nlQuery.queryResult.sessionId,
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
