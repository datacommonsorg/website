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

import { AppContext } from "./context";
import { getCallData, saveResponse } from "./data_store";
import { OneQuestion } from "./one_question";

const initialResponse = {
  overall: "",
  question: "",
  llmResponse: "",
  dcResponse: "",
  dcStat: "",
};
export interface EvalInfo {
  question: string;
  llmResponse: string;
  dcResponse: string;
  dcStat: string;
}

export interface Response extends EvalInfo {
  // overall evaluation of all the aspects
  overall: string;
  userEmail?: string;
}

export interface FeedbackFormProps {
  queryId: string;
  callId: string;
  evalInfo: EvalInfo;
}

export function FeedbackForm(props: FeedbackFormProps): JSX.Element {
  const { sheetId, userEmail } = useContext(AppContext);
  const [response, setResponse] = useState<Response>(initialResponse);
  const [completed, SetCompleted] = useState(false);

  useEffect(() => {
    getCallData(sheetId, props.queryId, props.callId).then((data) => {
      if (data) {
        setResponse(data as Response);
        SetCompleted(true);
      } else {
        setResponse(initialResponse);
        SetCompleted(false);
      }
    });
  }, [sheetId, props.queryId, props.callId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setResponse((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    response.userEmail = userEmail;
    saveResponse(sheetId, props.queryId, props.callId, response);
  };

  let dcResponseOptions;
  if (props.evalInfo.dcStat) {
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
  return (
    <>
      {completed && <h1>This question has already been completed.</h1>}
      <form onSubmit={handleSubmit}>
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
              disabled={completed}
            />
          </div>

          <div>
            <h2>GEMMA MODEL EVALUATION</h2>
            <h3>{props.evalInfo.question}</h3>
            <h3>{props.evalInfo.llmResponse}</h3>
            <OneQuestion
              question="Question from the model"
              name="question"
              options={{
                DC_QUESTION_IRRELEVANT: "Irrelevant, vague, requires editing",
                DC_QUESTION_RELEVANT: "Well formulated & relevant",
              }}
              handleChange={handleChange}
              responseField={response.question}
              disabled={completed}
            />
            <OneQuestion
              question="Model response quality"
              name="llmResponse"
              options={{
                LLM_STAT_ACCURATE: "Stats seem accurate",
                LLM_STAT_INACCURATE: "Stats seem inaccurate",
              }}
              handleChange={handleChange}
              responseField={response.llmResponse}
              disabled={completed}
            />
          </div>

          <div>
            <h2>DATA COMMONS EVALUATION</h2>
            <h3>{props.evalInfo.dcResponse}</h3>
            <h3>{props.evalInfo.dcStat}</h3>
            <OneQuestion
              question="Response from Data Commons"
              name="dcResponse"
              options={dcResponseOptions}
              handleChange={handleChange}
              responseField={response.dcResponse}
              disabled={completed}
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
              disabled={completed}
            />
          </div>

          <button type="submit" disabled={Object.values(response).includes("")}>
            Submit
          </button>
        </fieldset>
      </form>
    </>
  );
}
