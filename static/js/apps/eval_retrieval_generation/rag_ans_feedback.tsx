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

interface RagAnsResponse {
  claimsCount: number;
  falseClaimsCount: number;
  isSubmitted: boolean;
}

export function RagAnsFeedback(): JSX.Element {
  const { doc, sheetId, userEmail, evalType } = useContext(AppContext);
  const { sessionQueryId, sessionCallId } = useContext(SessionContext);
  const [response, setResponse] = useState<RagAnsResponse>(null);

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
          setResponse({
            claimsCount: Number(claimsCountData.toString()),
            falseClaimsCount: Number(falseClaimsCountData.toString()),
            isSubmitted: true,
          });
        } else {
          setResponse({
            claimsCount: 0,
            falseClaimsCount: 0,
            isSubmitted: false,
          });
        }
      }
    );
  }, [sheetId, sessionQueryId, sessionCallId]);

  const checkAndSubmit = async (): Promise<boolean> => {
    if (response === null) {
      return Promise.resolve(false);
    }
    if (response.isSubmitted) {
      return Promise.resolve(true);
    }
    loadSpinner(LOADING_CONTAINER_ID);
    return Promise.all([
      setField(
        getPath(sheetId, sessionQueryId),
        QUERY_TOTAL_CLAIMS_FEEDBACK_KEY,
        String(response.claimsCount)
      ),
      setField(
        getPath(sheetId, sessionQueryId),
        QUERY_FALSE_CLAIMS_FEEDBACK_KEY,
        String(response.falseClaimsCount)
      ),
      saveToSheet(
        userEmail,
        doc,
        sessionQueryId,
        sessionCallId,
        null,
        "",
        response.claimsCount,
        response.falseClaimsCount
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
    setResponse({
      claimsCount: 0,
      falseClaimsCount: 0,
      isSubmitted: false,
    });
  };

  if (response === null) {
    return null;
  }

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
          claimsCount={response.claimsCount}
          setClaimsCount={(count: number) => {
            setResponse((prevState) => {
              return { ...prevState, claimsCount: count };
            });
          }}
          falseClaimsCount={response.falseClaimsCount}
          setFalseClaimsCount={(count: number) => {
            setResponse((prevState) => {
              return { ...prevState, falseClaimsCount: count };
            });
          }}
          disabled={response.isSubmitted}
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
