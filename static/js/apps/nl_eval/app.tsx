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

import axios from "axios";
import React, { useState } from "react";

import { stringifyFn } from "../../utils/axios";
import { SentenceSection } from "./setence_section";
import { EmbeddingObject } from "./util";

interface AppPropType {
  evalGolden: Record<string, string[]>;
  modelNames: string[];
}

export function App(props: AppPropType): JSX.Element {
  const [customSentence, setCustomSentence] = useState("");
  const [customGolden, setCustomGolden] = useState<string[]>([]);
  const [overrideStatVars, setOverrideStatVars] = useState<
    Record<string, EmbeddingObject[]>
  >({});

  const handleStatVarSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const overrideInput = form.override ? form.override.value : "";
    fetchEmbeddings(overrideInput, props.modelNames).then((embeddings) => {
      setOverrideStatVars(embeddings);
    });
  };

  const handleQuerySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const sentenceInput = form.sentence.value;
    const statVarsInput = form.statVars ? form.statVars.value : "";
    setCustomSentence(sentenceInput);
    setCustomGolden(statVarsInput.split(",").map((s) => s.trim()));
  };

  return (
    <div>
      <div className="app-section">
        <h1>Override Stat Var Descriptions</h1>
        <form onSubmit={handleStatVarSubmit}>
          <textarea
            name="override"
            placeholder="One row per stat var like: `<dcid>,<description1;description2;...>`"
          />
          <button type="submit">Submit</button>
        </form>
      </div>
      <div className="app-section">
        <h1> New Custom Query</h1>
        <form onSubmit={handleQuerySubmit}>
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
            goldenStatVars={customGolden}
            overrideStatVars={overrideStatVars}
          />
        )}
      </div>
      <div className="app-section">
        <h1> Golden Eval Set</h1>
        {Object.keys(props.evalGolden).map((sentence) => {
          return (
            <SentenceSection
              key={sentence}
              sentence={sentence}
              modelNames={props.modelNames}
              goldenStatVars={props.evalGolden[sentence]}
              overrideStatVars={overrideStatVars}
            />
          );
        })}
      </div>
    </div>
  );
}

const fetchEmbeddings = async (input: string, modelNames: string[]) => {
  const lines = input.split("\n");
  if (lines.length === 0) {
    return;
  }

  const text2sv = {};
  for (const line of lines) {
    const [statVar, descriptions] = line.split(",");
    for (const description of descriptions.split(";")) {
      text2sv[description] = statVar;
    }
  }
  const allText = Object.keys(text2sv);
  const requests = modelNames.flatMap((modelName) =>
    allText.map((sentence) =>
      axios
        .get(`/api/nl/encode-vector`, {
          params: { sentence, modelName },
          paramsSerializer: stringifyFn,
        })
        .then((resp) => ({ modelName, data: resp.data }))
    )
  );

  const results = await Promise.all(requests);

  return results.reduce((acc, { modelName, data }) => {
    acc[modelName] = [] as EmbeddingObject[];
    for (let i = 0; i < allText.length; i++) {
      const sentence = allText[i];
      const item: EmbeddingObject = {
        embeddings: data[i],
        sentence,
        statVar: text2sv[sentence],
      };
      acc[modelName].push(item);
    }
    return acc;
  }, {});
};
