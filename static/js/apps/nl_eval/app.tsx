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
import _ from "lodash";
import React, { useRef, useState } from "react";

import { stringifyFn } from "../../utils/axios";
import { OverallScoreTable } from "./overall_score_table";
import { QuerySection } from "./query_section";
import { EmbeddingObject } from "./util";

interface AppPropType {
  evalGolden: Record<string, string[]>;
  modelNames: string[];
}

export function App(props: AppPropType): JSX.Element {
  const [customQuery, setCustomQuery] = useState("");
  const [customGolden, setCustomGolden] = useState<string[]>([]);
  const [customDescription, setCustomDescription] = useState<
    Record<string, EmbeddingObject[]>
  >({});
  const [completedOverallScore, setCompletedOverallScore] = useState({});

  const overallScore = useRef({});

  const handleCustomDescription = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const overrideInput = form.override ? form.override.value : "";
    fetchEmbeddings(overrideInput, props.modelNames).then((embeddings) => {
      setCustomDescription(embeddings);
    });
  };

  const handleCustomQuery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const queryInput = form.query.value;
    const statVarsInput = form.statVars ? form.statVars.value : "";
    setCustomQuery(queryInput);
    setCustomGolden(statVarsInput.split(",").map((s) => s.trim()));
  };

  const handleUpdateOverallScore = (
    model: string,
    sentence: string,
    score: number
  ) => {
    if (overallScore.current[model] === undefined) {
      overallScore.current[model] = {};
    }
    overallScore.current[model][sentence] = score;
    for (const modelName in overallScore.current) {
      if (
        Object.values(overallScore.current[modelName]).length !==
        Object.keys(props.evalGolden).length
      ) {
        return;
      }
    }
    // Only update when all models have the scores for all the eval queries.
    setCompletedOverallScore(overallScore.current);
  };

  return (
    <div>
      <div className="app-section">
        <h3>Try Your Own Stat Var Descriptions</h3>
        <p>
          These descriptions override existing descriptions and takes effect in
          all the results below
        </p>
        <p>
          Each row is in the form of
          &quot;stat_var_dcid,description1;description2;...&quot;
        </p>
        <form onSubmit={handleCustomDescription}>
          <textarea name="override" />
          <button type="submit">Apply</button>
        </form>
      </div>
      <div className="app-section">
        <h3> Try Your Own Query</h3>
        <p>
          You can see the stat var search results below and the matching score
          based on your ranked golden stat vars.
        </p>
        <form onSubmit={handleCustomQuery}>
          <input type="text" name="query" placeholder="Enter a query" />
          <input
            type="text"
            name="stat var list"
            placeholder="Enter golden stat vars (comma-separated)"
          />
          <button type="submit">Apply</button>
        </form>
        {customQuery && (
          <QuerySection
            key={customQuery}
            sentence={customQuery}
            modelNames={props.modelNames}
            goldenStatVars={customGolden}
            customDescription={customDescription}
            onScoreUpdated={handleUpdateOverallScore}
          />
        )}
      </div>
      <div className="app-section">
        <h3> Existing Eval Results for a collection of queries</h3>
        <OverallScoreTable data={completedOverallScore} />
        {Object.keys(props.evalGolden).map((sentence) => {
          return (
            <QuerySection
              key={sentence}
              sentence={sentence}
              modelNames={props.modelNames}
              goldenStatVars={props.evalGolden[sentence]}
              customDescription={customDescription}
              onScoreUpdated={handleUpdateOverallScore}
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

  const modelAndTextList = _.flatMap(modelNames, (modelName) => {
    return _.map(allText, (text) => {
      return [modelName, text];
    });
  });

  const requests = modelAndTextList.flatMap((modelAndText) =>
    axios
      .get(`/api/nl/encode-vector`, {
        params: { modelName: modelAndText[0], sentence: modelAndText[1] },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => ({ modelAndText, data: resp.data }))
  );

  const responses = await Promise.all(requests);
  console.log(responses);

  const result = {};
  for (const response of responses) {
    const { modelAndText, data } = response;
    const [modelName, text] = modelAndText;
    if (result[modelName] === undefined) {
      result[modelName] = [];
    }
    const item: EmbeddingObject = {
      embeddings: data[0],
      sentence: text,
      statVar: text2sv[text],
    };
    result[modelName].push(item);
  }
  return result;
};
