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

import { doc, setDoc } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";

import { db } from "../../utils/firebase";
import { AppContext } from "./context";
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

interface Response extends EvalInfo {
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

  useEffect(() => {
    setResponse(initialResponse);
  }, [props.evalInfo]);

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

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <div>
          <h2>OVERALL EVALUATION</h2>
          <OneQuestion
            question="Are there any hallucinations?"
            name="overall"
            options={{
              LLM_ANSWER_HALLUCINATION: "Found factual inaccuracies",
              LLM_ANSWER_OKAY: "No obvious factual inaccuracies",
            }}
            handleChange={handleChange}
            responseField={response.overall}
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
          />
        </div>

        <div>
          <h2>DATA COMMONS EVALUATION</h2>
          <h3>{props.evalInfo.dcResponse}</h3>
          <h3>{props.evalInfo.dcStat}</h3>
          <OneQuestion
            question="Response from Data Commons"
            name="dcResponse"
            options={{
              DC_ANSWER_EMPTY_BADNL: "Data exists, but NL fails to respond",
              DC_ANSWER_EMPTY_NODATA:
                "Query asks for data that doesn't exist in DC",
              DC_ANSWER_EMPTY_OUTOFSCOPE:
                "Query asks for data that is out-of-scope for DC",
              DC_ANSWER_IRRELEVANT: "Doesn't match the question",
              DC_ANSWER_RELEVANT: "Relevant and direct",
            }}
            handleChange={handleChange}
            responseField={response.dcResponse}
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
          />
        </div>

        <button type="submit" disabled={Object.values(response).includes("")}>
          Submit
        </button>
      </fieldset>
    </form>
  );
}

// Save response to Firestore
async function saveResponse(
  sheetId: string,
  queryId: string,
  callId: string,
  response: Response
): Promise<void> {
  try {
    // Define the document reference
    const docRef = doc(
      db,
      "sheets",
      sheetId,
      "queries",
      queryId,
      "calls",
      callId
    );
    // Save the data to Firestore
    await setDoc(docRef, response);
    console.log("API Call data saved successfully");
  } catch (error) {
    console.error("Error writing document: ", error);
  }
}
