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
import React, { useEffect, useRef, useState } from "react";

import { loadSpinner, removeSpinner } from "../../shared/util";
import { QuerySection } from "./query_section";
import { EmbeddingObject } from "./util";

const DESCRIPTION_TEXTAREA_ID = "description-textarea";

const DEFAULT_DESCRIPTION =
  'Count_Person,"population number"\ndc/topic/AgeMedians,"median age related"';
const DEFAULT_QUERIES = "how many population\nmedian age";

interface AppPropType {
  indexes: Record<string, Record<string, string>>;
  models: Record<string, Record<string, string | number>>;
}

export function App(props: AppPropType): JSX.Element {
  const [queries, setQueries] = useState<string[]>([]);
  const [description, setDescription] = useState<
    Record<string, EmbeddingObject[]>
  >({});
  const descriptionElem = useRef<HTMLTextAreaElement>(null);
  const queryElem = useRef<HTMLTextAreaElement>(null);

  const processDescription = (overrideInput: string) => {
    loadSpinner(DESCRIPTION_TEXTAREA_ID);
    const lines = CSV.parse(overrideInput);
    if (lines.length === 0) {
      return;
    }
    fetchEmbeddings(
      lines,
      Object.values(props.indexes).map((x) => x.model)
    ).then((embeddings) => {
      setDescription(embeddings);
      removeSpinner(DESCRIPTION_TEXTAREA_ID);
    });
  };

  const processQueries = (queryInput: string) => {
    setQueries(queryInput.split("\n"));
  };

  useEffect(() => {
    processDescription(DEFAULT_DESCRIPTION);
    processQueries(DEFAULT_QUERIES);
  }, []);

  const handleDescription = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const overrideInput = form.override ? form.override.value : "";
    processDescription(overrideInput);
  };

  const handleQuery = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const queryInput = form.query.value;
    processQueries(queryInput);
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "description" | "query",
    textArea: HTMLTextAreaElement
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (type === "description") {
          processDescription(text);
        } else if (type === "query") {
          processQueries(text);
        }
        textArea.value = text;
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <div className="app-section">
        <div className="text-box-title">
          Explore the variable matches for different models
        </div>
        <span>Enter or upload query (one per line)</span>
        <form onSubmit={handleQuery}>
          <textarea
            name="query"
            defaultValue={DEFAULT_QUERIES}
            ref={queryElem}
          />
          <button type="submit">Apply</button>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => handleFileUpload(e, "query", queryElem.current)}
          />
        </form>
      </div>

      <div className="app-section" id={DESCRIPTION_TEXTAREA_ID}>
        <div className="text-box-title">
          Validate and explore stat var descriptions (new or override)
        </div>
        <span>
          Enter or upload stat var descriptions. Each row in the form of{" "}
          {'dcid,"desc1;desc2"'}.
        </span>
        <form onSubmit={handleDescription}>
          <textarea
            name="override"
            defaultValue={DEFAULT_DESCRIPTION}
            ref={descriptionElem}
          />
          <button type="submit">Apply</button>
          <input
            type="file"
            accept=".csv"
            onChange={(e) =>
              handleFileUpload(e, "description", descriptionElem.current)
            }
          />
        </form>
        <div id="page-screen" className="screen">
          <div id="spinner"></div>
        </div>
      </div>

      <div className="app-section">
        {queries &&
          queries.map((query) => (
            <QuerySection
              key={query}
              sentence={query}
              indexes={props.indexes}
              models={props.models}
              description={description}
            />
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
  const allSentences = Object.keys(sentence2sv);
  const requests = [];
  for (const modelName of modelNames) {
    requests.push(
      axios
        .post(`/api/nl/encode-vector?model=${modelName}`, {
          queries: allSentences,
        })
        .then((resp) => ({ modelName, data: resp.data }))
    );
  }
  const responses = await Promise.all(requests);
  const result = {};
  for (const response of responses) {
    const { modelName, data } = response;
    result[modelName] = [];
    for (const sentence of allSentences) {
      result[modelName].push({
        embeddings: data[sentence],
        sentence,
        statVar: sentence2sv[sentence],
      });
    }
  }
  return result;
};
