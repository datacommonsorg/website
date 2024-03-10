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

import React, { useState } from "react";

import { SentenceSection } from "./setence_section";

interface AppPropType {
  evalGolden: Record<string, string[]>;
  modelNames: string[];
}

export function App(props: AppPropType): JSX.Element {
  const [customSentence, setCustomSentence] = useState("");
  const [customGoldenStatVars, setCustomGoldenStatVars] = useState<string[]>(
    []
  );

  const handleCustomSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const sentenceInput = form.sentence.value; // Access by name attribute
    const statVarsInput = form.statVars ? form.statVars.value : ""; // Access by name attribute

    setCustomSentence(sentenceInput);
    setCustomGoldenStatVars(statVarsInput.split(",").map((s) => s.trim())); // Split by comma and trim spaces
  };
  return (
    <div>
      <div className="custom-sentence">
        <form onSubmit={handleCustomSubmit}>
          <input
            type="text"
            name="sentence"
            placeholder="Enter a custom sentence"
          />
          <input
            type="text"
            name="stat var list"
            placeholder="Enter custom golden stat vars (comma-separated)"
          />
          <button type="submit">Submit</button>
        </form>
        {customSentence && (
          <SentenceSection
            key={customSentence}
            sentence={customSentence}
            modelNames={props.modelNames}
            goldenStatVars={customGoldenStatVars}
          />
        )}
      </div>
      {Object.keys(props.evalGolden).map((sentence) => {
        return (
          <SentenceSection
            key={sentence}
            sentence={sentence}
            modelNames={props.modelNames}
            goldenStatVars={props.evalGolden[sentence]}
          />
        );
      })}
    </div>
  );
}
