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
import {
  getInArcSubsectionElementId,
  getOutArcRowElementId,
} from "../../utils/browser_utils";
import { SpinnerWithText } from "./spinner";

const URL_PARAM_QUERY = "query";

const SAMPLE_QUESTIONS = [
  "What is the mechanism of action of atorvastatin?",
  "What genes are associated with dopamine via multilink annotation?",
  "What is the pharmacologic action of Diltiazem?",
  "Is there a complete genome for Monkeypox virus?",
  "What genes does rs429358 regulate?",
  "What is the hg38 genomic location of FGFR1?",
  "What is the ICD10 code of meningococcal meningitis?",
  "What disease is associated with rs7903146?",
  "What is the UMLS CUI for rheumatoid arthritis?",
  "What genes are associated with rs12777823?",
  "What can you tell me about atorvastatin?",
  "What are genetic variants with the gene symbol KIF6 that are associated with atorvastatin?",
  "What genetic variants are associated with premature birth?",
  "What is the host of Betapapillomavirus 1?",
  "What drugs is rs559628884 associated with?",
  "Are there any drugs that are known to be not associated with rs559628884?",
  "What is the HGNC ID of FGFR1?",
  "What genetic variants are associated with zonisamide?",
  "What is the concept unique id for rheumatoid arthritis?",
  "What is the chembl ID of acetaminophen?",
  "What genes are associated with Alzheimer's disease?",
];
const OVERVIEW_TEXT = `This experiment allows you to explore the Biomedical Data
  Commons knowledge graph with ease using natural language. Ask
  research questions in natural language, like "What genes are
  associated with Alzheimer's disease?". The AI model will
  interpret your query, search the knowledge graph, and return
  concise answers with links to relevant data. Your feedback is
  invaluable; a link to a feedback form will appear after each query.`;

const NO_DETECTED_ENTITIES = `We were unable to find entities in the knowledge
graph related to your query. Please try a query related to diseases, drugs, 
genes, genetic variants, taxons, or viruses.`;

const DETECTED_ENTITIES_BUT_NO_ANSWER = `There was an error or timeout in 
traversing the knowledge graph. We are unable to summarize an answer for your 
query. See below for entities found in the knowledge graph related to your 
query.`;

const FEEDBACK_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdSutPw3trI8X6kJwFESyle4XZ6Efbd5AvPFQaFmMiwSMfBxQ/viewform?usp=pp_url";
const FEEDBACK_QUERY_PARAM = "&entry.2089204314=";
const FEEDBACK_ANSWER_PARAM = "&entry.1084929806=";
const FEEDBACK_DEBUG_PARAM = "&entry.1464639663=";
const MAX_FORM_ANSWER_LENGTH = 1000;
const MAX_FORM_DEBUG_LENGTH = 500;

interface TripleReference {
  refNum: number;
  source: string;
  isOutgoing: boolean;
  prop: string;
  linkedType: string;
}

interface GraphEntity {
  name: string;
  dcid: string;
  types: string[];
}

// Interface for the response received from Biomed NL API.
interface BiomedNlApiResponse {
  query: string;
  answer: string;
  footnotes: TripleReference[];
  debug: string;
  entities: GraphEntity[];
}

// Interface for the displayed answer.
interface DisplayedAnswer {
  answer: string;
  feedbackLink: string;
  footnotes: JSX.Element;
  debugInfo: string;
  displayEntities: JSX.Element;
}

function getLegalDisclaimer(): JSX.Element {
  return (
    <>
      The use of this experimental UI is subject to the&nbsp;
      <a
        href="https://support.google.com/legal/answer/15696323"
        target="_blank"
        rel="noopener noreferrer"
      >
        Trusted Tester Agreement
      </a>
      . You may not share this link with people outside your organization.
      Don&apos;t hesitate to contact us at support@datacommons.org if you have
      any questions!
    </>
  );
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

const sampleQuestionToLink = (sampleQuestion: string): Link => {
  const params = new URLSearchParams({ [URL_PARAM_QUERY]: sampleQuestion });
  const queryUrl = `${window.location.pathname}?${params.toString()}`;
  return {
    id: sampleQuestion,
    title: sampleQuestion,
    url: queryUrl,
  };
};

function constructFeedbackLink(response: BiomedNlApiResponse): string {
  const queryField = `${FEEDBACK_QUERY_PARAM}${_.escape(response.query)}`;

  const answerField = `${FEEDBACK_ANSWER_PARAM}${response.answer.substring(
    0,
    MAX_FORM_ANSWER_LENGTH
  )}`;

  const flattenedFootnotes = response.footnotes
    .map(
      (ref) =>
        `${ref.refNum}-${ref.source}-${ref.isOutgoing ? "out" : "in"}-${
          ref.prop
        }-${ref.linkedType}`
    )
    .join(";");
  const fullDebug = response.debug + "\n" + flattenedFootnotes;

  const debugField = `${FEEDBACK_DEBUG_PARAM}${fullDebug.substring(
    0,
    MAX_FORM_DEBUG_LENGTH
  )}`;
  return `${FEEDBACK_FORM}${queryField}${answerField}${debugField}`;
}

function getFootnoteReferenceElementId(referenceNumber: string): string {
  return `biomednl-ref-${referenceNumber}`;
}

function getReferenceBrowserElementId(reference: TripleReference): string {
  return reference.isOutgoing
    ? getOutArcRowElementId(reference.prop)
    : getInArcSubsectionElementId(reference.linkedType, reference.prop);
}

function formatReferences(references: TripleReference[]): JSX.Element {
  if (!references.length) {
    return null;
  }
  return (
    <div
      css={css`
        margin-left: ${theme.spacing.lg}px;
      `}
    >
      {references.map(
        (reference: TripleReference, index: number): JSX.Element => {
          const browserElementId = getReferenceBrowserElementId(reference);

          const linkLabelItems = [reference.source, reference.prop];
          if (!reference.isOutgoing) {
            linkLabelItems.push(reference.linkedType);
          }

          return (
            <p key={index}>
              [{reference.refNum}]&nbsp;
              <a
                href={`/browser/${reference.source}#${browserElementId}`}
                id={getFootnoteReferenceElementId(reference.refNum.toString())}
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkLabelItems.join(".")}
              </a>
            </p>
          );
        }
      )}
    </div>
  );
}

/**
 * Replace citation numbers in textual answer with link to the footote
 * containing the full reference.
 *
 * [More detailed explanation of the function's behavior.]
 *
 * @param paramName [string] The final answer returned by the biomed_nl api
 * @returns [string] The final answer with citations linked to footnotes to be
 *  rendered in Markdown
 * @example
 * Input:
 * The following genetic variants are associated with premature birth:
 * rs10774053 [1, 2]
 *
 * Output:
 * The following genetic variants are associated with premature birth:
 * rs10774053 [<a href="#biomednl-ref-1">1</a>, <a href="#biomednl-ref-2">2</a>]
 */
function formatCitationsInResponse(answer: string): string {
  // Match instances of comma-separated numbers contained by square brackets
  // (any amount of whitespace is allowed)
  // Example matches: [d] or [d, d] or [d,d,d]
  const referencePattern = /\[(\s*\d+(\s*,\s*\d+)*\s*)\]/g;

  // Final, formatted answer will be rendered in markdown
  const annotatedAnswer = answer.replace(
    referencePattern,
    (_, commaSeparatedRefNums) => {
      return (
        "[" +
        commaSeparatedRefNums
          .split(",")
          .map(
            (refNum: string) =>
              `<a href="#${getFootnoteReferenceElementId(
                refNum.trim()
              )}">${refNum}</a>`
          )
          .join(",") +
        "]"
      );
    }
  );
  return annotatedAnswer;
}

/**
 * Renders a list of GraphEntity objects as clickable chips.
 *
 * This component takes an array of GraphEntity objects and generates a series of
 * styled <div> elements, each containing a link to the Data Commons browser
 * page for the entity. The entity's name, types, and DCID are displayed within
 * the chip.
 *
 * @param {GraphEntity[]} entities - An array of GraphEntity objects to render.
 * @returns {JSX.Element} A JSX.Element containing the list of entity chips.
 */
function generateRelatedEntityChips(entities: GraphEntity[]): JSX.Element {
  if (!entities.length) {
    return null;
  }

  return (
    <>
      {entities.map((entity) => {
        const capitalizedName = entity.name
          .split(" ")
          .map((word) => word[0].toUpperCase() + word.slice(1))
          .join(" ");
        return (
          <div
            css={css`
              display: block;
            `}
            key={entity.dcid}
          >
            <a
              href={`/browser/${entity.dcid}`}
              css={css`
                ${theme.box.primary};
                ${theme.elevation.primary};
                ${theme.radius.secondary};
                color: ${theme.colors.link.primary.base};
                line-height: 1rem;
                display: block;
                justify-content: center;
                align-items: center;
                text-align: left;
                gap: ${theme.spacing.sm}px;
                padding: ${theme.spacing.md}px;
                transition: background-color 0.1s ease-in-out,
                  box-shadow 0.1s ease-in-out;

                &:hover {
                  text-decoration: none;
                  color: ${theme.colors.link.primary.base};
                  cursor: pointer;
                }
              `}
              target="_blank"
              rel="noopener noreferrer"
            >
              <p
                css={css`
                  margin: 0;
                  ${theme.typography.text.md};
                `}
              >
                <span
                  css={css`
                    font-weight: 500;
                  `}
                >
                  {capitalizedName}
                </span>{" "}
                &nbsp;({entity.types.join(", ")})
              </p>
              <p
                css={css`
                  margin: 0;
                  ${theme.typography.text.sm};
                `}
              >
                {entity.dcid}
              </p>
            </a>
          </div>
        );
      })}
    </>
  );
}

function processApiResponse(response: BiomedNlApiResponse): DisplayedAnswer {
  const feedbackLink = constructFeedbackLink(response);

  if (!response.entities.length) {
    return {
      answer: NO_DETECTED_ENTITIES,
      feedbackLink,
      footnotes: null,
      debugInfo: response.debug,
      displayEntities: null,
    };
  }

  const formattedEntities = generateRelatedEntityChips(response.entities);
  if (!response.answer) {
    return {
      answer: DETECTED_ENTITIES_BUT_NO_ANSWER,
      feedbackLink,
      footnotes: null,
      debugInfo: response.debug,
      displayEntities: formattedEntities,
    };
  }

  return {
    answer: formatCitationsInResponse(response.answer),
    feedbackLink,
    footnotes: formatReferences(response.footnotes),
    debugInfo: response.debug,
    displayEntities: formattedEntities,
  };
}

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
   * useEffect hook to handle initial loading of information from the URL params.
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const queryFromUrl = urlParams.get(URL_PARAM_QUERY);
    if (queryFromUrl) {
      setQueryInput(queryFromUrl);
      setQueryFinal(queryFromUrl);
    }
  }, []); // Run only once to check url param on load

  function updateUrl(query: string): void {
    let newUrl = window.location.pathname;
    if (query) {
      const params = new URLSearchParams({ [URL_PARAM_QUERY]: query });
      newUrl += `?${params.toString()}`;
    }
    window.history.pushState({ query }, "", newUrl);
  }

  function submitQueryInput(): void {
    if (queryInput == queryFinal) {
      // Rerun the same query if requested by user.
      setRetriggerQuery(!retriggerQuery);
    } else {
      updateUrl(queryInput);
    }
    setQueryFinal(queryInput);
  }

  function resetToSampleQueries(): void {
    updateUrl("");
    setQueryInput("");
    setQueryFinal("");
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
        setAnswer(
          processApiResponse({
            query: queryFinal,
            answer: "There was a problem running the query, please try again.",
            footnotes: [],
            entities: [],
            debug: "",
          })
        );
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
          margin: 0 auto;
          gap: ${theme.spacing.sm}px;
          max-width: ${theme.width.xl}px;
          padding: 0 ${theme.spacing.xl}px;
        `}
      >
        <div>
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
                <p>{getLegalDisclaimer()}</p>
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
                  column-gap: ${theme.spacing.sm}px;
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
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {showLoading && <SpinnerWithText />}
            {!showLoading && answer && (
              <div
                className="answer"
                css={css`
                  padding-top: ${theme.spacing.lg}px;
                `}
              >
                <div
                  css={css`
                    ${theme.typography.heading.md};
                  `}
                >
                  {queryFinal}
                </div>
                <div
                  css={css`
                    margin: ${theme.spacing.md}px ${theme.spacing.sm}px;
                  `}
                >
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw as any]}
                    remarkPlugins={[remarkGfm]}
                  >
                    {answer.answer}
                  </ReactMarkdown>
                </div>
                {answer.footnotes && (
                  <Collapsible
                    trigger={getSectionTrigger(
                      "Knowledge Graph references",
                      false
                    )}
                    triggerWhenOpen={getSectionTrigger(
                      "Knowledge Graph references",
                      true
                    )}
                    open={true}
                  >
                    {answer.footnotes}
                  </Collapsible>
                )}
                {answer.displayEntities && (
                  <Collapsible
                    trigger={getSectionTrigger(
                      "Related Knowledge Graph entities",
                      false
                    )}
                    triggerWhenOpen={getSectionTrigger(
                      "Related Knowledge Graph entities",
                      true
                    )}
                    open={true}
                  >
                    <div
                      css={css`
                        display: flex;
                        flex-direction: row;
                        gap: ${theme.spacing.md}px;
                        align-items: center;
                        margin: ${theme.spacing.sm}px 0;
                        padding: ${theme.spacing.sm}px;
                        overflow-x: auto;
                      `}
                    >
                      {answer.displayEntities}
                    </div>{" "}
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
                  <p>
                    <span
                      onClick={resetToSampleQueries}
                      css={css`
                        color: ${theme.colors.link.primary.base};
                        cursor: pointer;
                      `}
                    >
                      &larr; Back to see sample queries.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
