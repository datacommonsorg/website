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

import React, { useContext, useEffect, useState } from "react";
import { Button } from "reactstrap";

import { loadSpinner, removeSpinner } from "../../shared/util";
import {
  DC_CALL_SHEET,
  DC_QUESTION_COL,
  DC_RESPONSE_COL,
  DC_STAT_COL,
  LLM_STAT_COL,
} from "./constants";
import { AppContext, SessionContext } from "./context";
import { getCallData, saveToSheet, saveToStore } from "./data_store";
import { OneQuestion } from "./one_question";
import { EvalInfo, Response } from "./types";

const LOADING_CONTAINER_ID = "form-container";

export enum FormStatus {
  NotStarted = 1,
  InProgress = 2,
  Completed = 3,
  Submitted = 4,
}

const emptyResponse = {
  overall: "",
  question: "",
  llmStat: "",
  dcResponse: "",
  dcStat: "",
};

export function EvalSection(): JSX.Element {
  const { allQuery, allCall, doc, sheetId, userEmail } = useContext(AppContext);
  const { sessionQueryId, setSessionQueryId, sessionCallId, setSessionCallId } =
    useContext(SessionContext);

  const [evalInfo, setEvalInfo] = useState<EvalInfo | null>(null);
  const [response, setResponse] = useState<Response>(emptyResponse);
  const [status, setStatus] = useState<FormStatus>(null);

  useEffect(() => {
    getCallData(sheetId, sessionQueryId, sessionCallId).then((data) => {
      if (data) {
        setResponse(data as Response);
        setStatus(FormStatus.Submitted);
      } else {
        setResponse(emptyResponse);
        setStatus(FormStatus.NotStarted);
      }
    });
  }, [sheetId, sessionQueryId, sessionCallId]);

  useEffect(() => {
    const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
    if (!(sessionQueryId in allCall)) {
      setEvalInfo(null);
      return;
    }
    const rowIdx = allCall[sessionQueryId][sessionCallId];
    sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
      const row = rows[0];
      if (row) {
        setEvalInfo({
          dcResponse: row.get(DC_RESPONSE_COL),
          dcStat: row.get(DC_STAT_COL),
          llmStat: row.get(LLM_STAT_COL),
          question: row.get(DC_QUESTION_COL),
        });
      }
    });
  }, [doc, allCall, sessionQueryId, sessionCallId, setSessionCallId]);

  const checkAndSubmit = async (): Promise<boolean> => {
    if (status === FormStatus.InProgress) {
      alert("Please fill in all fields");
      return false;
    }
    if (status === FormStatus.Completed) {
      loadSpinner(LOADING_CONTAINER_ID);
      return Promise.all([
        saveToStore(
          userEmail,
          sheetId,
          sessionQueryId,
          sessionCallId,
          response
        ),
        saveToSheet(userEmail, doc, sessionQueryId, sessionCallId, response),
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
    }
    // Otherwise form status is Submitted or NotStarted. Just proceed with
    // any action.
    return true;
  };

  const numCalls = () => {
    // Not all queries have calls.
    return Object.keys(allCall[sessionQueryId] || {}).length;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setResponse((prevState) => {
      const newState = {
        ...prevState,
        [name]: value,
      };
      let tmpStatus = FormStatus.Completed;
      for (const value of Object.values(newState)) {
        if (value === "") {
          tmpStatus = FormStatus.InProgress;
          break;
        }
      }
      setStatus(tmpStatus);
      return newState;
    });
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

  let dcResponseOptions;
  if (evalInfo) {
    if (evalInfo.dcStat) {
      dcResponseOptions = {
        DC_ANSWER_IRRELEVANT: "Doesn't match the question",
        DC_ANSWER_RELEVANT: "Relevant and direct",
      };
    } else {
      dcResponseOptions = {
        DC_ANSWER_EMPTY_BADNL: "Data exists, but NL fails to respond",
        DC_ANSWER_EMPTY_NODATA: "Query asks for data that doesn't exist in DC",
        DC_ANSWER_EMPTY_OUTOFSCOPE:
          "Query asks for data that is out-of-scope for DC",
      };
    }
  }

  return (
    <>
      <div id="form-container">
        {evalInfo && (
          <form>
            <fieldset>
              <div>
                <h2>OVERALL EVALUATION</h2>
                <OneQuestion
                  question="How is the overall answer?"
                  name="overall"
                  options={{
                    LLM_ANSWER_HALLUCINATION: "Found factual inaccuracies",
                    LLM_ANSWER_OKAY: "No obvious factual inaccuracies",
                  }}
                  handleChange={handleChange}
                  responseField={response.overall}
                  disabled={status === FormStatus.Submitted}
                />
              </div>

              <div>
                <h2>GEMMA MODEL EVALUATION</h2>
                <h3>{evalInfo.question}</h3>
                <h3>{evalInfo.llmStat}</h3>
                <OneQuestion
                  question="Question from the model"
                  name="question"
                  options={{
                    DC_QUESTION_IRRELEVANT:
                      "Irrelevant, vague, requires editing",
                    DC_QUESTION_RELEVANT: "Well formulated & relevant",
                  }}
                  handleChange={handleChange}
                  responseField={response.question}
                  disabled={status === FormStatus.Submitted}
                />
                <OneQuestion
                  question="Model response quality"
                  name="llmStat"
                  options={{
                    LLM_STAT_ACCURATE: "Stats seem accurate",
                    LLM_STAT_INACCURATE: "Stats seem inaccurate",
                  }}
                  handleChange={handleChange}
                  responseField={response.llmStat}
                  disabled={status === FormStatus.Submitted}
                />
              </div>

              <div>
                <h2>DATA COMMONS EVALUATION</h2>
                <h3>{evalInfo.dcResponse}</h3>
                <h3>{evalInfo.dcStat}</h3>
                <OneQuestion
                  question="Response from Data Commons"
                  name="dcResponse"
                  options={dcResponseOptions}
                  handleChange={handleChange}
                  responseField={response.dcResponse}
                  disabled={status === FormStatus.Submitted}
                />

                <OneQuestion
                  question="Response from Data Commons"
                  name="dcStat"
                  options={{
                    DC_STAT_ACCURATE: "Stats seem accurate",
                    DC_STAT_INACCURATE: "Stats seem inaccurate",
                  }}
                  handleChange={handleChange}
                  responseField={response.dcStat}
                  disabled={status === FormStatus.Submitted}
                />
              </div>
            </fieldset>
          </form>
        )}
      </div>
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
      <div id="page-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </>
  );
}
