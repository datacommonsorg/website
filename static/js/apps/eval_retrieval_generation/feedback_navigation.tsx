/**
 * Copyright 2024 Google LLC
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

/* Component with buttons for navigating the feedback pages */

import _ from "lodash";
import React, { useContext } from "react";
import { Button } from "reactstrap";

import { NEW_QUERY_CALL_ID } from "./constants";
import { AppContext, SessionContext } from "./context";
import { EvalType, FeedbackStage } from "./types";
import { getFirstFeedbackStage } from "./util";

interface FeedbackNavigationPropType {
  checkAndSubmit: () => Promise<boolean>;
  // This overrides the logic for whether or not to show the "next" button
  showNextOverride?: boolean;
}

export function FeedbackNavigation(
  props: FeedbackNavigationPropType
): JSX.Element {
  const { allQuery, allCall, userEmail, evalType } = useContext(AppContext);
  const {
    sessionQueryId,
    setSessionQueryId,
    sessionCallId,
    setSessionCallId,
    feedbackStage,
    setFeedbackStage,
  } = useContext(SessionContext);

  const userQuery = Object.keys(allQuery)
    .filter(
      (qId) => allQuery[qId].user === userEmail || allQuery[qId].user === null
    )
    .reduce((obj, qId) => {
      obj[qId] = allQuery[qId];
      return obj;
    }, {});

  const sortedQueryIds = Object.keys(userQuery)
    .map((qKey) => Number(qKey))
    .sort((a, b) => a - b);

  const numCalls = () => {
    // Not all queries have calls.
    return Object.keys(allCall[sessionQueryId] || {}).length;
  };

  // Button Actions
  const prevQuery = async () => {
    if (await props.checkAndSubmit()) {
      let targetId = sessionQueryId - 1;
      while (!(targetId in userQuery)) {
        targetId -= 1;
      }
      setSessionQueryId(targetId);
      setFeedbackStage(getFirstFeedbackStage(evalType));
      setSessionCallId(NEW_QUERY_CALL_ID);
    }
  };

  const prev = async () => {
    if (await props.checkAndSubmit()) {
      if (evalType === EvalType.RIG) {
        if (sessionCallId === 1) {
          setFeedbackStage(FeedbackStage.OVERALL);
        }
      }
    }
  };

  const next = async () => {
    if (await props.checkAndSubmit()) {
      if (evalType === EvalType.RIG) {
        if (feedbackStage === FeedbackStage.OVERALL) {
          setFeedbackStage(FeedbackStage.CALLS);
        } else {
          setSessionCallId(sessionCallId + 1);
        }
      }
    }
  };
  const nextQuery = async () => {
    if (await props.checkAndSubmit()) {
      let targetId = sessionQueryId + 1;
      while (!(targetId in userQuery)) {
        targetId += 1;
      }
      setSessionQueryId(targetId);
      setFeedbackStage(getFirstFeedbackStage(evalType));
      setSessionCallId(NEW_QUERY_CALL_ID);
    }
  };

  // Button Conditions
  const showPrevQuery = (): boolean => {
    if (_.isEmpty(sortedQueryIds)) {
      return false;
    }
    return (
      sessionQueryId > sortedQueryIds[0] &&
      feedbackStage === FeedbackStage.OVERALL
    );
  };

  const showPrev = (): boolean => {
    return feedbackStage === FeedbackStage.CALLS;
  };

  const showNext = (): boolean => {
    if (props.showNextOverride !== undefined) {
      return props.showNextOverride;
    }
    return sessionCallId < numCalls();
  };

  const showNextQuery = (): boolean => {
    if (_.isEmpty(sortedQueryIds) || showNext()) {
      return false;
    }
    return sessionQueryId < sortedQueryIds[sortedQueryIds.length - 1];
  };

  return (
    <div className="feedback-nav-section">
      {feedbackStage === FeedbackStage.CALLS && (
        <div className="item-num">
          <span className="highlight">{sessionCallId}</span>
          <span className="regular">/ {numCalls()} ITEMS IN THIS QUERY</span>
        </div>
      )}
      <div className="nav-buttons">
        {showPrev() && (
          <Button
            onClick={() => {
              prev();
            }}
            className="btn-transparent"
          >
            <div>
              <span className="material-icons-outlined">
                keyboard_arrow_left
              </span>
              Previous
            </div>
          </Button>
        )}
        {showPrevQuery() && (
          <Button
            onClick={() => {
              prevQuery();
            }}
            className="btn-transparent"
          >
            <div>Previous query</div>
          </Button>
        )}
        {showNext() && (
          <Button
            onClick={() => {
              next();
            }}
            className="btn-blue"
          >
            <div>
              <span className="material-icons-outlined">
                keyboard_arrow_right
              </span>
              Next
            </div>
          </Button>
        )}
        {showNextQuery() && (
          <Button
            onClick={() => {
              nextQuery();
            }}
            className="btn-blue"
          >
            <div>Continue to next query</div>
          </Button>
        )}
        {!showNext() && !showNextQuery() && (
          <Button
            onClick={() => {
              props.checkAndSubmit();
            }}
            className="btn-blue"
          >
            <div>Finish</div>
          </Button>
        )}
      </div>
    </div>
  );
}
