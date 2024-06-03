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

import React, { useContext, useRef } from "react";
import { Button } from "reactstrap";

import { AppContext, SessionContext } from "./context";
import { FeedbackForm, FormStatus } from "./feedback_form";

export function EvalSection(): JSX.Element {
  const { allQuery, allCall } = useContext(AppContext);
  const { sessionQueryId, setSessionQueryId, sessionCallId, setSessionCallId } =
    useContext(SessionContext);

  const formRef = useRef(null);

  const submitForm = async (): Promise<boolean> => {
    return formRef.current.submitForm();
  };

  const checkAndSubmit = async (): Promise<boolean> => {
    const formStatus = formRef.current.status();
    if (formStatus === FormStatus.InProgress) {
      alert("Please fill in all fields");
      return false;
    }
    if (formStatus === FormStatus.Completed) {
      return submitForm();
    }
    // Otherwise form status is Submitted or NotStarted. Just proceed with
    // any action.
    return true;
  };

  const numCalls = () => {
    // Not all queries have calls.
    return Object.keys(allCall[sessionQueryId] || {}).length;
  };

  // Button Actions
  const prevQuery = async () => {
    if (await checkAndSubmit()) {
      let targetId = sessionQueryId - 1;
      while (!(targetId in allQuery)) {
        targetId -= 1;
      }
      setSessionQueryId(targetId);
      setSessionCallId(1);
    }
  };
  const prev = async () => {
    if (await checkAndSubmit()) {
      if (sessionCallId > 1) {
        setSessionCallId(sessionCallId - 1);
      }
    }
  };
  const next = async () => {
    if (await checkAndSubmit()) {
      if (sessionCallId < numCalls()) {
        setSessionCallId(sessionCallId + 1);
      }
    }
  };
  const nextQuery = async () => {
    if (await checkAndSubmit()) {
      let targetId = sessionQueryId + 1;
      while (!(targetId in allQuery)) {
        targetId += 1;
      }
      setSessionQueryId(targetId);
      setSessionCallId(1);
    }
  };

  // Button Conditions
  const showPrevQuery = (): boolean => {
    return sessionCallId == 1 && sessionQueryId > 1;
  };
  const showPrev = (): boolean => {
    return sessionCallId > 1;
  };
  const showNext = (): boolean => {
    return sessionCallId < numCalls();
  };
  const showNextQuery = (): boolean => {
    return (
      // When a query does not have any calls, the call id is 1 and num calls
      // is 0.
      sessionCallId >= numCalls() &&
      sessionQueryId < Object.keys(allQuery).length
    );
  };

  return (
    <>
      <FeedbackForm ref={formRef} />
      {formRef.current && (
        <div>
          <span>
            {sessionCallId} / {numCalls()} ITEMS IN THIS QUERY
          </span>
          {showPrevQuery() && (
            <Button
              onClick={() => {
                prevQuery();
              }}
            >
              Previous Query
            </Button>
          )}
          {showPrev() && (
            <Button
              onClick={() => {
                prev();
              }}
            >
              Previous
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
        </div>
      )}
    </>
  );
}
