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

/* Component to record feedback for a query */
import React, { useContext, useEffect, useState } from "react";

import { loadSpinner, removeSpinner } from "../../shared/util";
import {
  QUERY_OVERALL_FEEDBACK_KEY,
  QUERY_OVERALL_OPTION_HALLUCINATION,
  QUERY_OVERALL_OPTION_OK,
} from "./constants";
import { AppContext, SessionContext } from "./context";
import { getField, getPath, saveToSheet, setField } from "./data_store";
import { FeedbackNavigation } from "./feedback_navigation";
import { OneQuestion } from "./one_question";

const LOADING_CONTAINER_ID = "form-container";
const RESPONSE_OPTIONS = {
  [QUERY_OVERALL_OPTION_HALLUCINATION]: "Found factual inaccuracies",
  [QUERY_OVERALL_OPTION_OK]: "No obvious factual inaccuracies",
};

export function QueryFeedback(): JSX.Element {
  const { doc, sheetId, userEmail, allCall } = useContext(AppContext);
  const { sessionQueryId, sessionCallId } = useContext(SessionContext);
  const [response, setResponse] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(null);

  useEffect(() => {
    loadSpinner(LOADING_CONTAINER_ID);
    getField(getPath(sheetId, sessionQueryId), QUERY_OVERALL_FEEDBACK_KEY)
      .then((data) => {
        if (data) {
          setResponse(data.toString());
          setIsSubmitted(true);
        } else {
          setResponse("");
          setIsSubmitted(false);
        }
      })
      .finally(() => removeSpinner(LOADING_CONTAINER_ID));
  }, [sheetId, sessionQueryId, sessionCallId]);

  const checkAndSubmit = async (): Promise<boolean> => {
    if (isSubmitted) {
      return Promise.resolve(true);
    }
    loadSpinner(LOADING_CONTAINER_ID);
    return Promise.all([
      setField(
        getPath(sheetId, sessionQueryId),
        QUERY_OVERALL_FEEDBACK_KEY,
        response
      ),
      saveToSheet(
        userEmail,
        doc,
        sessionQueryId,
        sessionCallId,
        null,
        response
      ),
    ])
      .then(() => {
        return true;
      })
      .catch((error) => {
        alert("Error submitting response: " + error);
        return false;
      })
      .finally(() => {
        removeSpinner(LOADING_CONTAINER_ID);
      });
  };

  const handleChange = (event) => {
    const { value } = event.target;
    setResponse(value);
  };

  const showNext = (): boolean => {
    return (
      Object.keys(allCall[sessionQueryId] || {}).length > 0 &&
      response !== QUERY_OVERALL_OPTION_HALLUCINATION
    );
  };

  return (
    <>
      <div id={LOADING_CONTAINER_ID}>
        <form>
          <fieldset>
            <div>
              <h2>OVERALL EVALUATION</h2>
              <OneQuestion
                question="How is the overall answer?"
                name="overall"
                options={RESPONSE_OPTIONS}
                handleChange={handleChange}
                responseField={response}
                disabled={isSubmitted}
              />
            </div>
          </fieldset>
        </form>
      </div>
      <FeedbackNavigation
        checkAndSubmit={checkAndSubmit}
        showNextOverride={showNext()}
      />
      <div id="page-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </>
  );
}
