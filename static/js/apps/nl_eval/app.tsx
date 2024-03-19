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
import React, { useEffect, useRef, useState } from "react";

import { stringifyFn } from "../../utils/axios";
import { QuerySection } from "./query_section";
import { EmbeddingObject } from "./util";

function OverallScoreTable(props: {
  data: Record<string, Record<string, number>>;
  count: number;
}) {
  const [mark, setMark] = useState(null);
  useEffect(() => {
    // Check if data is complete. If so, set mark to an empty string so that no
    // new render is triggered.
    if (Object.values(Object.values(props.data)[0]).length === props.count) {
      setMark("");
      return;
    }
    // Update mark to be a new timestamp frequently if data is not complete
    const timerId = setInterval(() => {
      setMark(new Date().toLocaleTimeString());
    }, 100);
    return () => clearInterval(timerId);
  }, [props.count, props.data, mark]);

  return (
    <table className="overall-score-table">
      <thead>
        <tr>
          <th>Model Name</th>
          <th>Total Average Score</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(props.data).map((modelName) => {
          const scoreArray = Object.values(props.data[modelName]);
          // Only render rows where the score array length matches props.count
          if (scoreArray.length !== props.count) {
            return null;
          }
          const meanScore = _.mean(scoreArray).toFixed(3);
          return (
            <tr key={modelName}>
              <td>{modelName}</td>
              <td>{meanScore}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

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
  const overallScore = useRef({});
  props.modelNames.forEach((modelName) => {
    overallScore.current[modelName] = {};
  });

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
    if (overallScore.current[model] != undefined) {
      overallScore.current[model][sentence] = score;
    }
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
            setScore={handleUpdateOverallScore}
          />
        )}
      </div>
      <div className="app-section">
        <h3> Existing Eval Results for a collection of queries</h3>
        <OverallScoreTable
          data={overallScore.current}
          count={Object.keys(props.evalGolden).length}
        />
        {Object.keys(props.evalGolden).map((sentence) => {
          return (
            <QuerySection
              key={sentence}
              sentence={sentence}
              modelNames={props.modelNames}
              goldenStatVars={props.evalGolden[sentence]}
              customDescription={customDescription}
              setScore={handleUpdateOverallScore}
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
