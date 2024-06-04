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

import { QUERY_FEEDBACK_CALL_ID } from "./constants";
import { AppContext, SessionContext } from "./context";

interface FeedbackNavigationPropType {
  checkAndSubmit: () => Promise<boolean>;
  // This overrides the logic for whether or not to show the "next" button
  showNextOverride?: boolean;
}

export function FeedbackNavigation(
  props: FeedbackNavigationPropType
): JSX.Element {
  const { allQuery, allCall } = useContext(AppContext);
  const { sessionQueryId, setSessionQueryId, sessionCallId, setSessionCallId } =
    useContext(SessionContext);
  const sortedQueryIds = Object.keys(allQuery)
    .map((qKey) => Number(qKey))
    .sort();

  const numCalls = () => {
    // Not all queries have calls.
    return Object.keys(allCall[sessionQueryId] || {}).length;
  };

  // Button Actions
  const prevQuery = async () => {
    if (await props.checkAndSubmit()) {
      let targetId = sessionQueryId - 1;
      while (!(targetId in allQuery)) {
        targetId -= 1;
      }
      setSessionQueryId(targetId);
      setSessionCallId(QUERY_FEEDBACK_CALL_ID);
    }
  };

  const prev = async () => {
    if (await props.checkAndSubmit()) {
      setSessionCallId(sessionCallId - 1);
    }
  };

  const next = async () => {
    if (await props.checkAndSubmit()) {
      setSessionCallId(sessionCallId + 1);
    }
  };
  const nextQuery = async () => {
    if (await props.checkAndSubmit()) {
      let targetId = sessionQueryId + 1;
      while (!(targetId in allQuery)) {
        targetId += 1;
      }
      setSessionQueryId(targetId);
      setSessionCallId(QUERY_FEEDBACK_CALL_ID);
    }
  };

  // Button Conditions
  const showPrevQuery = (): boolean => {
    if (_.isEmpty(sortedQueryIds)) {
      return false;
    }
    return (
      sessionQueryId > sortedQueryIds[0] &&
      sessionCallId === QUERY_FEEDBACK_CALL_ID
    );
  };

  const showPrev = (): boolean => {
    return sessionCallId > QUERY_FEEDBACK_CALL_ID;
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
      {sessionCallId !== QUERY_FEEDBACK_CALL_ID && (
        <span>
          {sessionCallId} / {numCalls()} ITEMS IN THIS QUERY
        </span>
      )}
      <div className="nav-buttons">
        {showPrev() && (
          <Button
            onClick={() => {
              prev();
            }}
          >
            Previous
          </Button>
        )}
        {showPrevQuery() && (
          <Button
            onClick={() => {
              prevQuery();
            }}
          >
            Previous Query
          </Button>
        )}
        {showNext() && (
          <Button
            onClick={() => {
              next();
            }}
          >
            Next
          </Button>
        )}
        {showNextQuery() && (
          <Button
            onClick={() => {
              nextQuery();
            }}
          >
            Continue to next query
          </Button>
        )}
        {!showNext() && !showNextQuery() && (
          <Button
            onClick={() => {
              props.checkAndSubmit();
            }}
          >
            Finish
          </Button>
        )}
      </div>
    </div>
  );
}
