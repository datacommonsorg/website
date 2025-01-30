/**
 * Copyright 2025 Google LLC
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

/**
 * Main component for the datagemma page
 */
import axios from "axios";
import _ from "lodash";
import queryString from "query-string";
import React, { ReactElement, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Input } from "reactstrap";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { stringifyFn } from "../../utils/axios";
import { updateHash } from "../../utils/url_utils";
import { processTableText } from "../eval_retrieval_generation/util";

// Constants for query modes
const RIG_MODE = "rig";
const RAG_MODE = "rag";
// Constants for URL hash parameters
const URL_HASH_PARAMS = {
  query: "q",
  mode: "m"
}

// Interface for the displayed answer.
interface DisplayedAnswer {
  answer: string;
  footnotes: string;
}

/**
 * Helper function to process a RIG query response into a displayable answer.
 * Splits the response into the answer and footnotes sections.
 * @param response The raw response string from the RIG query.
 * @returns A DisplayedAnswer object containing the parsed answer and footnotes.
 */
function processRigResponse(response: string): DisplayedAnswer {
  const answer_parts = response.split("#### FOOTNOTES ####\n");
  let footnotes = "";
  if (answer_parts.length > 1) {
    footnotes = answer_parts[1];
    footnotes = footnotes.replaceAll("\n", "\n\n");
  }
  return { answer: answer_parts[0], footnotes };
}

/**
 * Helper function to process a RAG query response into a displayable answer.
 * Splits the response into the answer and footnotes sections.
 * @param response The raw response string from the RAG query.
 * @returns A DisplayedAnswer object containing the parsed answer and footnotes.
 */
function processRagResponse(response: string): DisplayedAnswer {
  const answer_parts = response.split("#### TABLES ####\n");
  let footnotes = "";
  if (answer_parts.length > 1) {
    const footnotes_part = answer_parts[1];
    const table_list = footnotes_part.split("Table");
    for (const t of table_list) {
      const trimmed_t = t.trim();
      if (!trimmed_t) {
        continue;
      }

      const title = _.cloneDeep(trimmed_t).split("\n", 1)[0];
      const tableContent = trimmed_t.replace(title, "");
      const processedTable = processTableText(tableContent.trim());
      footnotes += "Table " + title + "\n" + processedTable + "\n\n";
    }
  }
  return { answer: answer_parts[0], footnotes };
}

/**
 * Application container
 */
export function App(): ReactElement {
  const [query, setQuery] = useState<string>("");
  const [answer, setAnswer] = useState<DisplayedAnswer>(null);
  const [mode, setMode] = useState<string>(RIG_MODE);
  const [showLoading, setShowLoading] = useState<boolean>(false);

  /**
   * useEffect hook to handle initial loading of information from the URL hash.
   */
  useEffect(() => {
    const hashParams = queryString.parse(window.location.hash);
    const hashQuery = (hashParams[URL_HASH_PARAMS.query] || "") as string;
    const hashMode = (hashParams[URL_HASH_PARAMS.mode] || "") as string;
    if (hashQuery) {
      setQuery(hashQuery);
    }
    if (hashMode) {
      setMode(hashMode);
    }
  }, []);

  /**
   * Function to execute the query when the "Run" button is clicked.
   */
  function onQueryRun(): void {
    setShowLoading(true);
    updateHash({ [URL_HASH_PARAMS.query]: query });
    axios
      .get("/api/dev/datagemma/query", {
        params: { query, mode },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        if (mode === RIG_MODE) {
          setAnswer(processRigResponse(resp.data));
        } else if (mode === RAG_MODE) {
          setAnswer(processRagResponse(resp.data));
        }
      })
      .catch(() => {
        setAnswer({
          answer: "There was a problem running the query, please try again.",
          footnotes: ""
        });
      })
      .finally(() => {
        setShowLoading(false);
      });
  }

  return (
    <>
      <div className="title">DataGemma Playground</div>
      <div className="inputs">
        <div className="query-input">
          <label>query</label>
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mode-input">
          {[RIG_MODE, RAG_MODE].map((m) => {
            return (
              <div className="mode-option">
                <Input
                  type="radio"
                  name=""
                  value={m}
                  checked={mode === m}
                  onChange={() => {
                    setMode(m);
                    updateHash({ [URL_HASH_PARAMS.mode]: m });
                  }}
                />
                <label>{m}</label>
              </div>)
          })}
        </div>
        <div onClick={onQueryRun} className="btn btn-primary">
          Run
        </div>
      </div>
      <div className="answer">
        {showLoading && <div>Loading ...</div>}
        {!showLoading && answer && (
          <div>
            <h2>Answer</h2>
            <ReactMarkdown
              rehypePlugins={[rehypeRaw as any]}
              remarkPlugins={[remarkGfm]}
            >
              {answer.answer}
            </ReactMarkdown>
            {answer.footnotes && (
              <div className="footnotes">
                <h2>Footnotes</h2>
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw as any]}
                  remarkPlugins={[remarkGfm]}
                >
                  {answer.footnotes}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
