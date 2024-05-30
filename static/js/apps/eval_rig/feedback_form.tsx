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

import React, { useEffect, useState } from "react";

export interface EvalInfo {
  question: string;
  llmResponse: string;
  dcResponse: string;
  dcStat: string;
}

export interface FeedbackFormProps {
  evalInfo: EvalInfo;
}

const initialState = {
  overall: "",
  question: "",
  llmResponse: "",
  dcResponse: "",
  dcStat: "",
};

export function FeedbackForm(props: FeedbackFormProps): JSX.Element {
  const [responses, setResponses] = useState(initialState);

  useEffect(() => {
    // Reset responses whenever evalInfo changes
    setResponses(initialState);
  }, [props.evalInfo]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setResponses((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveResponses(responses);
  };

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <div>
          <h2>OVERALL EVALUATION</h2>
          <h3>Are there any hallucinations?</h3>
          <label>
            <input
              type="radio"
              name="overall"
              value="0"
              checked={responses.overall === "0"}
              onChange={handleChange}
            />
            Yes
          </label>
          <label>
            <input
              type="radio"
              name="overall"
              value="1"
              checked={responses.overall === "1"}
              onChange={handleChange}
            />
            No
          </label>
        </div>

        <div>
          <h2>GEMMA MODEL EVALUATION</h2>
          <h3>{props.evalInfo.question}</h3>
          <h3>{props.evalInfo.llmResponse}</h3>
          <h3>Question from the model</h3>
          <label>
            <input
              type="radio"
              name="question"
              value="0"
              checked={responses.question === "0"}
              onChange={handleChange}
            />
            Well Formulated
          </label>
          <label>
            <input
              type="radio"
              name="question"
              value="1"
              checked={responses.question === "1"}
              onChange={handleChange}
            />
            Irrelevant
          </label>

          <h3>Model response quality</h3>
          <label>
            <input
              type="radio"
              name="llmResponse"
              value="0"
              checked={responses.llmResponse === "0"}
              onChange={handleChange}
            />
            Stats Seem Accurate
          </label>
          <label>
            <input
              type="radio"
              name="llmResponse"
              value="1"
              checked={responses.llmResponse === "1"}
              onChange={handleChange}
            />
            Stat values seem off
          </label>
        </div>

        <div>
          <h2>DATA COMMONS EVALUATION</h2>
          <h3>{props.evalInfo.dcResponse}</h3>
          <h3>{props.evalInfo.dcStat}</h3>
          <h3>Response from Data Commons</h3>
          <label>
            <input
              type="radio"
              name="dcResponse"
              value="0"
              checked={responses.dcResponse === "0"}
              onChange={handleChange}
            />
            Relevant and direct
          </label>
          <label>
            <input
              type="radio"
              name="dcResponse"
              value="1"
              checked={responses.dcResponse === "1"}
              onChange={handleChange}
            />
            Doesn&apos;t match the question
          </label>

          <h3>Data Commons stat quality</h3>
          <label>
            <input
              type="radio"
              name="dcStat"
              value="0"
              checked={responses.dcStat === "0"}
              onChange={handleChange}
            />
            Stats Seem Accurate
          </label>
          <label>
            <input
              type="radio"
              name="dcStat"
              value="1"
              checked={responses.dcStat === "1"}
              onChange={handleChange}
            />
            Stat values seem off
          </label>
        </div>

        <button type="submit">Submit</button>
      </fieldset>
    </form>
  );
}

// Mock function to simulate API call to save responses
function saveResponses(responses) {
  console.log("API Call to save responses:", responses);
}
