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
/** @jsxImportSource @emotion/react */

/**
 * Main component for the Biomedical NL interface page
 */

import { css, ThemeProvider } from "@emotion/react";
import axios from "axios";
import _ from "lodash";
import queryString from "query-string";
import React, { ReactElement, useEffect, useState } from "react";
import Collapsible from "react-collapsible";
import ReactMarkdown from "react-markdown";
import { Input } from "reactstrap";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import theme from "../../theme/theme";
import { stringifyFn } from "../../utils/axios";
import { updateHash } from "../../utils/url_utils";

// Constants for URL hash parameters
const URL_HASH_PARAMS = {
  q: "q",
};

// Interface for the response received from Biomed NL API.
interface BiomedNlApiResponse {
  answer: string;
  debug: string;
}

// Interface for the displayed answer.
interface DisplayedAnswer {
  answer: string;
  footnotes: string;
  debugInfo: string;
}

function getSectionTrigger(title: string, opened: boolean): JSX.Element {
  return (
    <div
      css={css`
        ${theme.typography.heading.md};
        margin-bottom: ${theme.spacing.sm}px;
        cursor: pointer;
        &:hover {
          color: ${theme.colors.background.secondary};
        }
      `}
    >
      <span className="material-icons-outlined">
        {opened ? "arrow_drop_down" : "arrow_right"}
      </span>
      <span>{title}</span>
    </div>
  );
}

function processApiResponse(response: BiomedNlApiResponse): DisplayedAnswer {
  // TODO: format the markdown response
  const footnotes = "";
  return { answer: response.answer, footnotes, debugInfo: response.debug };
}

/**
 * Application container
 */
export function App(): ReactElement {
  const [query, setQuery] = useState<string>("");
  const [answer, setAnswer] = useState<DisplayedAnswer>(null);
  const [showLoading, setShowLoading] = useState<boolean>(false);

  /**
   * useEffect hook to handle initial loading of information from the URL hash.
   */
  useEffect(() => {
    const hashParams = queryString.parse(window.location.hash);
    const hashQuery = (hashParams[URL_HASH_PARAMS.q] || "") as string;
    if (hashQuery) {
      setQuery(hashQuery);
    }
  }, []);

  /**
   * Function to execute the query when the "Run" button is clicked.
   */
  function onQueryRun(): void {
    setShowLoading(true);
    updateHash({ [URL_HASH_PARAMS.q]: query });
    axios
      .get("/api/experiments/biomed_nl/query", {
        params: { q: query },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        setAnswer(processApiResponse(resp.data));
      })
      .catch(() => {
        setAnswer({
          answer: "There was a problem running the query, please try again.",
          footnotes: "",
          debugInfo: "",
        });
      })
      .finally(() => {
        setShowLoading(false);
      });
  }

  return (
    <ThemeProvider theme={theme}>
      <div
        className="app"
        css={css`
          margin: ${theme.spacing.xl}px;
          margin-top: 0;
          display: flex;
          flex-direction: column;
          gap: ${theme.spacing.lg}px;
        `}
      >
        <div
          className="inputs"
          css={css`
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: ${theme.spacing.sm}px;
          `}
        >
          <div
            className="query-input"
            css={css`
              display: flex;
              align-items: center;
              gap: ${theme.spacing.sm}px;
              width: 100%;
            `}
          >
            <label>Query</label>
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div onClick={onQueryRun} className="btn btn-primary">
              run
            </div>
          </div>
        </div>
        <div
          className="answer"
          css={css`
            & > table,
            th,
            td {
              border: solid;
            }
          `}
        >
          {showLoading && <div>Loading ...</div>}
          {!showLoading && answer && (
            <div>
              <div
                css={css`
                  ${theme.typography.heading.md};
                  margin-bottom: ${theme.spacing.sm}px;
                `}
              >
                Answer
              </div>
              <ReactMarkdown
                rehypePlugins={[rehypeRaw as any]}
                remarkPlugins={[remarkGfm]}
              >
                {answer.answer}
              </ReactMarkdown>
              {answer.footnotes && (
                <Collapsible
                  trigger={getSectionTrigger("Footnotes", false)}
                  triggerWhenOpen={getSectionTrigger("Footnotes", true)}
                  open={true}
                >
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw as any]}
                    remarkPlugins={[remarkGfm]}
                  >
                    {answer.footnotes}
                  </ReactMarkdown>
                </Collapsible>
              )}
              {answer.debugInfo && (
                <Collapsible
                  trigger={getSectionTrigger("Debug", false)}
                  triggerWhenOpen={getSectionTrigger("Debug", true)}
                  open={false}
                >
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw as any]}
                    remarkPlugins={[remarkGfm]}
                  >
                    {answer.debugInfo}
                  </ReactMarkdown>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
