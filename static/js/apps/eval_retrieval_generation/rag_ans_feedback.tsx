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

/* Component to record feedback for a rag answer */

import React, { useContext, useEffect, useState } from "react";
import { Button } from "reactstrap";

import { loadSpinner, removeSpinner } from "../../shared/util";
import { ClaimCounter } from "./claim_counter";
import {
  QUERY_FALSE_CLAIMS_FEEDBACK_KEY,
  QUERY_TOTAL_CLAIMS_FEEDBACK_KEY,
} from "./constants";
import { AppContext, SessionContext } from "./context";
import { getField, getPath, saveToSheet, setField } from "./data_store";
import { EvalList } from "./eval_list";
import { FeedbackNavigation } from "./feedback_navigation";
import { TablePane } from "./table_pane";
import { EvalType } from "./types";

const LOADING_CONTAINER_ID = "form-container";

export function RagAnsFeedback(): JSX.Element {
  const { doc, sheetId, userEmail, evalType } = useContext(AppContext);
  const { sessionQueryId, sessionCallId } = useContext(SessionContext);
  const [claimsCount, setClaimsCount] = useState<number>(0);
  const [falseClaimsCount, setFalseClaimsCount] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(null);

  useEffect(() => {
    loadSpinner(LOADING_CONTAINER_ID);
    const claimsCountPromise = getField(
      getPath(sheetId, sessionQueryId),
      QUERY_TOTAL_CLAIMS_FEEDBACK_KEY
    );
    const falseClaimsCountPromise = getField(
      getPath(sheetId, sessionQueryId),
      QUERY_FALSE_CLAIMS_FEEDBACK_KEY
    );
    Promise.all([claimsCountPromise, falseClaimsCountPromise]).then(
      ([claimsCountData, falseClaimsCountData]) => {
        if (claimsCountData && falseClaimsCountData) {
          setClaimsCount(Number(claimsCountData.toString()));
          setFalseClaimsCount(Number(falseClaimsCountData.toString()));
          setIsSubmitted(true);
        } else {
          setClaimsCount(0);
          setFalseClaimsCount(0);
          setIsSubmitted(false);
        }
      }
    );
  }, [sheetId, sessionQueryId, sessionCallId]);

  const checkAndSubmit = async (): Promise<boolean> => {
    if (isSubmitted) {
      return Promise.resolve(true);
    }
    loadSpinner(LOADING_CONTAINER_ID);
    return Promise.all([
      setField(
        getPath(sheetId, sessionQueryId),
        QUERY_TOTAL_CLAIMS_FEEDBACK_KEY,
        String(claimsCount)
      ),
      setField(
        getPath(sheetId, sessionQueryId),
        QUERY_FALSE_CLAIMS_FEEDBACK_KEY,
        String(falseClaimsCount)
      ),
      saveToSheet(
        userEmail,
        doc,
        sessionQueryId,
        sessionCallId,
        null,
        "",
        claimsCount,
        falseClaimsCount
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

  const enableReeval = () => {
    setClaimsCount(0);
    setFalseClaimsCount(0);
    setIsSubmitted(false);
  };

  return (
    <>
      <div className="button-section">
        <Button className="reeval-button" onClick={enableReeval}>
          <div>
            <span className="material-icons-outlined">redo</span>
            Re-Eval
          </div>
        </Button>
        <EvalList />
      </div>
      <div id={LOADING_CONTAINER_ID}>
        <ClaimCounter
          claimsCount={claimsCount}
          setClaimsCount={setClaimsCount}
          falseClaimsCount={falseClaimsCount}
          setFalseClaimsCount={setFalseClaimsCount}
          disabled={isSubmitted}
        />
      </div>
      {evalType === EvalType.RAG && <TablePane />}
      <FeedbackNavigation checkAndSubmit={checkAndSubmit} />
      <div id="page-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </>
  );
}
