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

const SAMPLE_QUESTIONS = [
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
const OVERVIEW_TEXT = `This experiment allows you to explore the Biomedical Data
  Commons knowledge graph with ease using natural language. Ask
  research questions in natural language, like "What genes are
  associated with Alzheimer's disease?". The AI model will
  interpret your query, search the knowledge graph, and return
  concise answers with links to relevant data. Your feedback is
  invaluable; a feedback form will appear after each query.`;

const FEEDBACK_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdSutPw3trI8X6kJwFESyle4XZ6Efbd5AvPFQaFmMiwSMfBxQ/viewform?usp=pp_url";
const FEEDBACK_QUERY_PARAM = "&entry.2089204314=";
const FEEDBACK_ANSWER_PARAM = "&entry.1084929806=";
const FEEDBACK_DEBUG_PARAM = "&entry.1464639663=";
const MAX_FORM_ANSWER_LENGTH = 1000;
const MAX_FORM_DEBUG_LENGTH = 500;
// Interface for the response received from Biomed NL API.
interface BiomedNlApiResponse {
  answer: string;
  footnotes: string;
  debug: string;
}

// Interface for the displayed answer.
interface DisplayedAnswer {
  answer: string;
  feedbackLink: string;
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

const sampleQuestionToLink = (sampleQuestion: string): Link => ({
  id: sampleQuestion,
  title: sampleQuestion,
  url: `/experiments/biomed_nl#q=${encodeURIComponent(sampleQuestion)}`,
});

/**
 * Application container
 */
export function App(): ReactElement {
  const [queryInput, setQueryInput] = useState<string>("");
  const [queryFinal, setQueryFinal] = useState<string>("");
  const [answer, setAnswer] = useState<DisplayedAnswer>(null);
  const [showLoading, setShowLoading] = useState<boolean>(false);
  const [retriggerQuery, setRetriggerQuery] = useState<boolean>(false);

  /**
   * useEffect hook to handle initial loading of information from the URL hash.
   */
  useEffect(() => {
    const hashParams = queryString.parse(window.location.hash);
    const hashQuery = (hashParams[URL_HASH_PARAMS.q] || "") as string;
    if (hashQuery) {
      setQueryInput(hashQuery);
      setQueryFinal(hashQuery);
    }
  }, []); // Run only once to check hash param on load

  function submitQueryInput(): void {
    updateHash({ [URL_HASH_PARAMS.q]: queryInput });

    setRetriggerQuery(!retriggerQuery);
    setQueryFinal(queryInput);
  }

  function handleKeydownEvent(
    event: React.KeyboardEvent<HTMLDivElement>
  ): void {
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        submitQueryInput();
        break;
    }
  }

  useEffect(() => {
    function formatFeedbackLink(response: string, debugInfo: string): string {
      const queryField = `${FEEDBACK_QUERY_PARAM}${queryFinal}`;
      const responseField = `${FEEDBACK_ANSWER_PARAM}${response.substring(
        0,
        MAX_FORM_ANSWER_LENGTH
      )}`;
      const debugField = `${FEEDBACK_DEBUG_PARAM}${debugInfo.substring(
        0,
        MAX_FORM_DEBUG_LENGTH
      )}`;
      return `${FEEDBACK_FORM}${queryField}${responseField}${debugField}`;
    }
    function formatReferences(footnotes: string): string {
      const jsonStrings = footnotes.split(/}\n{/g);
      const result = [];
      // Add back the "}" and "{" that were removed by the split, except for the first and last element
      for (let i = 0; i < jsonStrings.length; i++) {
        let str = jsonStrings[i].trim();
        if (i > 0) {
          str = "{" + str;
        }
        if (i < jsonStrings.length - 1) {
          str = str + "}";
        }
        const reference = JSON.parse(str);
        const elementId =
          reference.direction == "Outgoing"
            ? `browser-arc-${reference.prop}-0`
            : `${reference.linked_type}-${reference.prop}`;
        const href = `/browser/${reference.source}#${elementId}`;
        const formattedIncomingType =
          reference.direction == "Outgoing"
            ? ""
            : `.(${reference.linked_type})`;
        const linkLabel = `${reference.source}.${reference.prop}${formattedIncomingType}`;
        const link = `<p>[${reference.key}] <a href="${href}" id="biomednl-ref-${reference.key}" target="_blank">${linkLabel}</a></p>`;
        result.push(link);
      }
      return result.join("\n");
    }

    function formatReferencesInResponse(answer: string): string {
      const referencePattern = /\[(\d+)\]/g;
      const annotatedAnswer = answer.replace(referencePattern, (match, key) => {
        return `<a href="#biomednl-ref-${key}">${match}</a>`;
      });
      return annotatedAnswer;
    }

    function processApiResponse(
      response: BiomedNlApiResponse
    ): DisplayedAnswer {
      // TODO: format the markdown response
      return {
        answer: formatReferencesInResponse(response.answer),
        feedbackLink: formatFeedbackLink(
          response.answer,
          response.debug + response.footnotes
        ),
        footnotes: formatReferences(response.footnotes),
        debugInfo: response.debug,
      };
    }
    if (!queryFinal) {
      setAnswer(null);
      return;
    }
    setShowLoading(true);
    axios
      .get("/api/experiments/biomed_nl/query", {
        params: { q: queryFinal },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        setAnswer(processApiResponse(resp.data));
      })
      .catch(() => {
        setAnswer({
          answer: "There was a problem running the query, please try again.",
          feedbackLink: formatFeedbackLink("", ""),
          footnotes: "",
          debugInfo: "",
        });
      })
      .finally(() => {
        setShowLoading(false);
      });
  }, [queryFinal, retriggerQuery]);

  return (
    <ThemeProvider theme={theme}>
      <div
        className="app"
        css={css`
          margin-left: ${theme.spacing.xl}px;
          gap: ${theme.spacing.sm}px;
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
              <p className="overview">{OVERVIEW_TEXT}</p>
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
                value={queryInput}
                onChange={(e): void => setQueryInput(e.target.value)}
                onKeyDown={(event): void => handleKeydownEvent(event)}
                className="search-input-text"
              />
              <div
                onClick={(): void => submitQueryInput()}
                id="rich-search-button"
              ></div>
            </InputGroup>
          </div>
        </div>
        <div
          css={css`
            margin: ${theme.spacing.lg}px;
          `}
        >
          {!showLoading && !answer && (
            <div
              className="example-queries"
              css={css`
                columns: 2;
                column-gap: ${theme.spacing.md}px;
              `}
            >
              {SAMPLE_QUESTIONS.map((question, index) => {
                return (
                  <div
                    key={question}
                    css={css`
                      padding: ${theme.spacing.md}px;
                      break-inside: avoid;
                      p {
                        margin-bottom: ${theme.spacing.xs}px;
                      }
                    `}
                  >
                    <LinkBox
                      link={sampleQuestionToLink(question)}
                      color={"blue"}
                      dataTestId={`question-item-${index}`}
                      useXsHeadingTitle={true}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="loading">{showLoading && <SpinnerWithText />}</div>
          <div className="answer">
            {!showLoading && answer && (
              <div>
                <div className="matched-entities">{/* TODO! */}</div>
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
                <div className="feedback-form">
                  <p>---</p>
                  <p>
                    <a
                      href={answer.feedbackLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Tell us how we did.
                    </a>
                  </p>
                </div>
                {answer.footnotes && (
                  <Collapsible
                    trigger={getSectionTrigger(
                      "Knowledge Graph References",
                      false
                    )}
                    triggerWhenOpen={getSectionTrigger(
                      "Knowledge Graph References",
                      true
                    )}
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
      </div>
    </ThemeProvider>
  );
}
