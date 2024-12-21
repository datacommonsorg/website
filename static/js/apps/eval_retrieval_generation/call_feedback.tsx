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

/* Component to record feedback for a call within a query */

import React, { FormEvent, useContext, useEffect, useState } from "react";

import { loadSpinner, removeSpinner } from "../../shared/util";
import {
  DC_QUESTION_FEEDBACK_COL,
  DC_RESPONSE_FEEDBACK_COL,
  FEEDBACK_PANE_ID,
  LLM_STAT_FEEDBACK_COL,
} from "./constants";
import { AppContext, SessionContext } from "./context";
import { getCallData, saveToSheet, saveToStore } from "./data_store";
import { FeedbackWrapper } from "./feedback_wrapper";
import { OneQuestion } from "./one_question";
import { DcCallInfo, EvalInfo, EvalType, Response } from "./types";

const EMPTY_RESPONSE = {
  [EvalType.RIG]: {
    dcResponse: "",
    llmStat: "",
    question: "",
  },
  [EvalType.RAG]: {
    dcResponse: "",
    question: "",
  },
};
const DC_RESPONSE_OPTIONS = {
  [EvalType.RIG]: {
    DC_ANSWER_IRRELEVANT: "Does not match the question",
    DC_ANSWER_RELEVANT_INACCURATE: "Relevant, but inaccurate",
    DC_ANSWER_RELEVANT_UNSURE: "Relevant, but unsure if it is accurate",
    DC_ANSWER_RELEVANT_ACCURATE: "Relevant and accurate",
  },
  [EvalType.RAG]: {
    DC_ANSWER_IRRELEVANT: "Does not match the question",
    DC_ANSWER_RELEVANT: "Matches the question",
  },
};

export enum FormStatus {
  NotStarted = 1,
  InProgress = 2,
  Completed = 3,
  Submitted = 4,
}

export function CallFeedback(): JSX.Element {
  const { allCall, doc, sheetId, userEmail, evalType } = useContext(AppContext);
  const { sessionQueryId, sessionCallId } = useContext(SessionContext);

  const [evalInfo, setEvalInfo] = useState<EvalInfo | null>(null);
  const [response, setResponse] = useState<Response>(EMPTY_RESPONSE[evalType]);
  const [status, setStatus] = useState<FormStatus>(null);
  const [applyToNext, setApplyToNext] = useState(false);

  useEffect(() => {
    getCallData(sheetId, sessionQueryId, sessionCallId).then((data) => {
      if (data) {
        setResponse(data as Response);
        setStatus(FormStatus.Submitted);
      } else {
        // If applyToNext has been set, we should just use the state of the
        // previous question for the next question
        if (applyToNext) {
          return;
        }
        setResponse(EMPTY_RESPONSE[evalType]);
        setStatus(FormStatus.NotStarted);
      }
    });
  }, [sheetId, sessionQueryId, sessionCallId, applyToNext]);

  useEffect(() => {
    if (!(sessionQueryId in allCall)) {
      setEvalInfo(null);
      return;
    }
    const callInfo: DcCallInfo | null = allCall[sessionQueryId][sessionCallId];
    if (callInfo) {
      const tableResponse =
        evalType === EvalType.RIG ? "" : ` \xb7 Table ${sessionCallId}`;
      setEvalInfo({
        dcResponse: `${callInfo.dcResponse}${tableResponse}`,
        dcStat: callInfo.dcStat,
        llmStat: callInfo.llmStat,
        question: callInfo.question,
      });
    } else {
      setEvalInfo(null);
    }
  }, [doc, allCall, sessionQueryId, sessionCallId]);

  const checkAndSubmit = async (): Promise<boolean> => {
    if (status === FormStatus.InProgress) {
      alert("Please fill in all fields");
      return false;
    }
    if (status === FormStatus.Completed) {
      loadSpinner(FEEDBACK_PANE_ID);
      const sheetValues = {
        [DC_QUESTION_FEEDBACK_COL]: response.question,
        [DC_RESPONSE_FEEDBACK_COL]: response.dcResponse,
        [LLM_STAT_FEEDBACK_COL]: response.llmStat || "",
      };
      return Promise.all([
        saveToStore(
          userEmail,
          sheetId,
          sessionQueryId,
          sessionCallId,
          response
        ),
        saveToSheet(userEmail, doc, sessionQueryId, sessionCallId, sheetValues),
      ])
        .then(() => {
          return true;
        })
        .catch((error) => {
          alert("Error submitting response: " + error);
          return false;
        })
        .finally(() => {
          removeSpinner(FEEDBACK_PANE_ID);
        });
    }
    // Otherwise form status is Submitted or NotStarted. Just proceed with
    // any action.
    return true;
  };

  const handleApplyToNextChange = (): void => {
    setApplyToNext(!applyToNext);
  };

  const handleChange = (event: FormEvent<HTMLInputElement>): void => {
    const { name, value } = event.target as HTMLInputElement;
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

  const enableReeval = (): void => {
    setResponse(EMPTY_RESPONSE[evalType]);
    setStatus(FormStatus.NotStarted);
  };

  let dcResponseOptions;
  let dcResponseQuestion;
  if (evalInfo) {
    if (evalInfo.dcStat) {
      dcResponseQuestion = "Response from Data Commons";
      dcResponseOptions = DC_RESPONSE_OPTIONS[evalType];
    } else {
      dcResponseQuestion = "Reason for empty Data Commons response";
      dcResponseOptions = {
        DC_ANSWER_EMPTY_BADNL: "Data exists, but NL fails to respond",
        DC_ANSWER_EMPTY_NODATA: "Query asks for data that doesn't exist in DC",
        DC_ANSWER_EMPTY_OUTOFSCOPE:
          "Query asks for data that is out-of-scope for DC",
      };
    }
  }

  return (
    <FeedbackWrapper onReEval={enableReeval} checkAndSubmit={checkAndSubmit}>
      {evalInfo && (
        <>
          <form>
            <fieldset>
              <div className="question-section">
                <div className="title">GEMMA MODEL QUESTION EVALUATION</div>
                <div className="subtitle">
                  <span
                    className={`${
                      evalType === EvalType.RAG ? "dc-question" : ""
                    }`}
                  >
                    {evalInfo.question}
                  </span>
                </div>
                <OneQuestion
                  question="Question from the model"
                  name="question"
                  options={{
                    DC_QUESTION_IRRELEVANT: "Irrelevant, vague",
                    DC_QUESTION_RELEVANT: "Well formulated & relevant",
                  }}
                  handleChange={handleChange}
                  responseField={response.question}
                  disabled={status === FormStatus.Submitted}
                />
              </div>
              {evalType === EvalType.RIG && (
                <div className="question-section">
                  <div className="title">GEMMA MODEL STAT EVALUATION</div>
                  <div className="subtitle">
                    <span className="llm-stat">{evalInfo.llmStat}</span>
                  </div>
                  <OneQuestion
                    question="Model response quality"
                    name="llmStat"
                    options={{
                      LLM_STAT_INACCURATE: "Stats seem inaccurate",
                      LLM_STAT_NOTSURE: "Unsure about accuracy",
                      LLM_STAT_ACCURATE: "Stats seem accurate",
                    }}
                    handleChange={handleChange}
                    responseField={response.llmStat}
                    disabled={status === FormStatus.Submitted}
                  />
                </div>
              )}

              <div className="question-section">
                <div className="title">DATA COMMONS EVALUATION</div>
                <div className="subtitle">
                  <span
                    className={`${evalType === EvalType.RAG ? "dc-stat" : ""}`}
                  >
                    {evalInfo.dcResponse}
                  </span>
                  {evalType === EvalType.RIG && (
                    <span className="dc-stat">{evalInfo.dcStat}</span>
                  )}
                </div>
                <OneQuestion
                  question={dcResponseQuestion}
                  name="dcResponse"
                  options={dcResponseOptions}
                  handleChange={handleChange}
                  responseField={response.dcResponse}
                  disabled={status === FormStatus.Submitted}
                />
              </div>
            </fieldset>
          </form>

          <div className="apply-to-next">
            <label>
              <input
                type="checkbox"
                checked={applyToNext}
                onChange={handleApplyToNextChange}
                disabled={status === FormStatus.Submitted}
              />
              Apply the same evaluation to the next item
            </label>
          </div>
        </>
      )}
    </FeedbackWrapper>
  );
}
