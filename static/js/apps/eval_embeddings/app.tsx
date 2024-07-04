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
import * as CSV from "csv-string";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { MemoIndexScoreBox } from "./index_score_box";
import { EmbeddingObject } from "./util";

const DEFAULT_DESCRIPTION = 'Count_Person,"population number"';
const DEFAULT_QUERY_STRING = "how many population";
const DEFAULT_INDEX = "base_uae_mem";

const _INDEX_NAME_ANNOTATION = {
  base_uae_mem: " (PROD)",
  medium_ft: " (CUSTOM DC)",
};

interface AppPropType {
  indexes: Record<string, Record<string, string>>;
  models: Record<string, Record<string, string | number>>;
}

interface appState {
  queries: string[];
  embeddings: Record<string, EmbeddingObject[]>;
}

export function App(props: AppPropType): JSX.Element {
  const descriptionElem = useRef<HTMLTextAreaElement>(null);
  const queryElem = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState({
    description: DEFAULT_DESCRIPTION,
    query: DEFAULT_QUERY_STRING,
  });

  const [appState, setAppState] = useState<appState>({
    embeddings: {},
    queries: [],
  });

  const [checkedIndexes, setCheckedIndexes] = useState<string[]>([
    DEFAULT_INDEX,
  ]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setCheckedIndexes((prevCheckedIndexes) =>
      checked
        ? [...prevCheckedIndexes, name]
        : prevCheckedIndexes.filter((index) => index !== name)
    );
  };

  useEffect(() => {
    if (!checkedIndexes) {
      return;
    }
    const lines = CSV.parse(input.description);
    if (lines.length === 0) {
      setAppState({ queries: input.query.split("\n"), embeddings: {} });
      return;
    }
    fetchEmbeddings(
      lines,
      _.values(_.pick(props.indexes, checkedIndexes)).map((x) => x["model"])
    ).then((embeddings) => {
      setAppState({ queries: input.query.split("\n"), embeddings });
    });
  }, [checkedIndexes, input, props.indexes]);

  const handleApply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (queryElem.current) {
      setInput({
        description: descriptionElem.current.value,
        query: queryElem.current.value,
      });
    }
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    textArea: HTMLTextAreaElement
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        textArea.value = text;
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <div id="checkbox-container">
        <div className="text-box-title">Select Indexes</div>
        {Object.keys(props.indexes).map((indexName) => (
          <label key={indexName}>
            <input
              type="checkbox"
              name={indexName}
              checked={checkedIndexes.includes(indexName)}
              onChange={handleCheckboxChange}
            />
            {indexName + (_INDEX_NAME_ANNOTATION[indexName] || "")}
          </label>
        ))}
      </div>
      <div className="app-section">
        <div className="text-box-title">
          Explore the variable matches for different models
        </div>
        <form onSubmit={handleApply}>
          <div>
            <span>Enter or upload query (one per line)</span>
            <textarea
              name="query"
              defaultValue={DEFAULT_QUERY_STRING}
              ref={queryElem}
            />
            <input
              type="file"
              accept=".txt"
              onChange={(e) => handleFileUpload(e, queryElem.current)}
            />
          </div>
          <div>
            <div className="text-box-title">
              Validate and explore stat var descriptions (new or override)
            </div>
            <span>
              Enter or upload stat var descriptions. Each row in the form of{" "}
              {'dcid,"desc1;desc2"'}.
            </span>
            <textarea
              name="override"
              defaultValue={DEFAULT_DESCRIPTION}
              ref={descriptionElem}
            />
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, descriptionElem.current)}
            />
          </div>
          <button type="submit">Apply</button>
        </form>
      </div>

      <div className="app-section">
        {appState.queries.length > 0 &&
          checkedIndexes.length > 0 &&
          appState.queries.map((query) => (
            <div key={query} className="query-section">
              <h3>{query}</h3>
              <div className="model-result-container">
                {checkedIndexes.map((indexName) => {
                  const modelName = props.indexes[indexName].model;
                  const embeddings = appState.embeddings[modelName];
                  if (!embeddings) {
                    return null;
                  }

                  return (
                    <MemoIndexScoreBox
                      key={indexName}
                      sentence={query}
                      indexName={indexName}
                      modelName={modelName}
                      modelScoreThreshold={Number(
                        props.models[modelName].score_threshold
                      )}
                      additionalEmbeddings={embeddings}
                    />
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

const fetchEmbeddings = async (lines: string[][], modelNames: string[]) => {
  const sentence2sv = {};
  for (const line of lines) {
    if (line.length < 2) {
      continue;
    }
    const statVar = line[0];
    const descriptions = line[1];
    for (let sentence of descriptions.split(";")) {
      sentence = sentence.trim();
      sentence2sv[sentence] = statVar;
    }
  }
  const queries = Object.keys(sentence2sv);
  if (queries.length === 0) {
    const result = {};
    for (const modelName of modelNames) {
      result[modelName] = [];
    }
    return result;
  }
  const requests = [];
  for (const modelName of modelNames) {
    requests.push(
      axios
        .post(`/api/nl/encode-vector?model=${modelName}`, {
          queries,
        })
        .then((resp) => ({ modelName, data: resp.data }))
    );
  }
  const responses = await Promise.all(requests);
  const result = {};
  for (const response of responses) {
    const { modelName, data } = response;
    result[modelName] = [];
    for (const query of queries) {
      result[modelName].push({
        embeddings: data[query],
        sentence: query,
        statVar: sentence2sv[query],
      });
    }
  }
  return result;
};
