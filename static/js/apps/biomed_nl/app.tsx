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
import queryString from "query-string";
import React, { ReactElement, useEffect, useState } from "react";
import Collapsible from "react-collapsible";
import ReactMarkdown from "react-markdown";
import { Input, InputGroup } from "reactstrap";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import SimpleText from "../../components/content/simple_text";
import { Search } from "../../components/elements/icons/search";
import { Link, LinkBox } from "../../components/elements/link_box";
import theme from "../../theme/theme";
import { stringifyFn } from "../../utils/axios";
import { updateHash } from "../../utils/url_utils";
import { SpinnerWithText } from "./spinner";

// Constants for URL hash parameters
const URL_HASH_PARAMS = {
  q: "q",
};

const sampleQuestions = [
  "What genes are associated with Alzheimer's disease?",
  "What is the mechanism of action of atorvastatin?",
  "Is there a complete genome for Monkeypox virus?",
  "What genes does rs429358 regulate?",
  "What is the hg38 genomic location of FGFR1?",
  "What type of gene is FGFR1?",
  "What is the ICD10 code of meningococcal meningitis?",
  "What is the UMLS CUI for rheumatoid arthritis?",
  "What can you tell me about atorvastatin?",
  "What genetic variants are associated with premature birth?",
  "What is the host of Betapapillomavirus 1?",
  "What is the HGNC ID of FGFR1?",
  "What is the concept unique id for rheumatoid arthritis?",
  "What is the chembl ID of acetaminophen?",
];
const overviewText = `This experiment allows you to explore the Biomedical Data
  Commons knowledge graph with ease using natural language. Ask
  research questions in natural language, like "What genes are
  associated with Alzheimer's disease?". The AI model will
  interpret your query, search the knowledge graph, and return
  concise answers with links to relevant data. Your feedback is
  invaluable; a feedback form will appear after each query.`;

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

// Headings for Footer and Debug dropdown sections
function getSectionTrigger(title: string, opened: boolean): JSX.Element {
  return (
    <div
      css={css`
        ${theme.typography.heading.xs};
        margin-bottom: ${theme.spacing.sm}px;
        cursor: pointer;
        &:hover {
          color: ${theme.colors.background.secondary};
        }
        display: flex;
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

const sampleQuestionToLink = (sampleQuestion: string): Link => ({
  id: sampleQuestion,
  title: sampleQuestion,
  url: `/experiments/biomed_nl#q=${encodeURIComponent(sampleQuestion)}`,
});

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
    const handleHashChange = (): void => {
      const hashParams = queryString.parse(window.location.hash);
      const hashQuery = (hashParams[URL_HASH_PARAMS.q] || "") as string;
      if (hashQuery) {
        onHashChange(hashQuery);
      }
    };

    // Execute query when hash params are updated.
    window.addEventListener("hashchange", handleHashChange);

    // Check if query is provided in hash param on load.
    handleHashChange();

    // Cleanup the event listener
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []); // Run only once to set up the listener

  function setHashToQuery(): void {
    updateHash({ [URL_HASH_PARAMS.q]: query });
  }

  function handleKeydownEvent(
    event: React.KeyboardEvent<HTMLDivElement>
  ): void {
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        setHashToQuery();
        break;
    }
  }

  /**
   * Function to execute the query when the "Run" button is clicked.
   */
  function onHashChange(query: string): void {
    setQuery(query);
    setShowLoading(true);
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
          margin-left: ${theme.spacing.xl}px;
          gap: ${theme.spacing.lg}px;
          width: 70%;
        `}
      >
        <div className="header">
          <p
            css={css`
              ${theme.typography.text.sm}
            `}
          >
            Experiments by Data Commons
          </p>
          <SimpleText>
            <>
              <h3 className="title">Exploring biomedical data</h3>
              <p className="overview">{overviewText}</p>
            </>
          </SimpleText>
        </div>
        <div
          className="inputs"
          css={css`
            gap: ${theme.spacing.sm}px;
          `}
        >
          <div className="search-bar">
            <InputGroup className="search-bar-content">
              <span className="search-bar-icon">
                <Search />
              </span>
              <Input
                type="text"
                value={query}
                onChange={(e): void => setQuery(e.target.value)}
                onKeyDown={(event): void => handleKeydownEvent(event)}
                className="search-input-text"
              />
              <div onClick={setHashToQuery} id="rich-search-button"></div>
            </InputGroup>
          </div>
        </div>
        <div className="example-queries">
          {!showLoading && !answer && (
            <div
              css={css`
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: ${theme.spacing.lg}px;
              `}
            >
              {sampleQuestions.map((question, index) => {
                return (
                  <LinkBox
                    key={question}
                    link={sampleQuestionToLink(question)}
                    color={"blue"}
                    section={`sample-q ${index}`}
                    dataTestId={`question-item-${index}`}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="loading">{showLoading && <SpinnerWithText />}</div>
        <div className="answer">
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
