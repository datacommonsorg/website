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

import { GoogleSpreadsheet } from "google-spreadsheet";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { DcCallInfo, DcCalls, EvalType, FeedbackStage, Query } from "./types";
import { getAnswerFromQueryAndAnswerSheet, processText } from "./util";

const ANSWER_LOADING_MESSAGE = "Loading answer...";
const ACTIVE_ANNOTATION_CLASSNAME = "annotation-active";

interface AnswerMetadata {
  evalType: EvalType;
  feedbackStage: FeedbackStage;
  queryId: number;
}

function getFormattedRagCallAnswer(
  dcQuestion: string,
  dcResponse: string,
  tableId: string
): string {
  const formattedQuestion = `<span class="dc-question">**${dcQuestion}**</span>`;
  const formattedStat = `<span class="dc-stat">${dcResponse} \xb7 Table ${tableId}</span>`;
  return `<span class="annotation annotation-rag annotation-${tableId}">${formattedQuestion}<br/>${formattedStat}</span>`;
}

function getAnswerFromRagCalls(
  allCall: Record<number, DcCalls>,
  queryId: number
): string {
  if (!allCall[queryId]) {
    return "No questions were generated.";
  }
  const tableIds = Object.keys(allCall[queryId]).sort(
    (a, b) => Number(a) - Number(b)
  );
  const answers = [];
  tableIds.forEach((tableId) => {
    const tableInfo: DcCallInfo | null = allCall[queryId][tableId];
    if (tableInfo) {
      answers.push(
        getFormattedRagCallAnswer(
          tableInfo.question,
          tableInfo.dcResponse,
          tableId
        )
      );
    }
  });
  return answers.join("\n\n");
}

function getAnswer(
  doc: GoogleSpreadsheet,
  query: Query,
  allCall: Record<number, DcCalls>,
  evalType: EvalType,
  feedbackStage: FeedbackStage
): Promise<{ answer: string; metadata: AnswerMetadata }> {
  const metadata = {
    evalType,
    feedbackStage,
    queryId: query.id,
  };
  let answerPromise = null;
  if (
    evalType === EvalType.RAG &&
    (feedbackStage === FeedbackStage.CALLS ||
      feedbackStage === FeedbackStage.OVERALL_QUESTIONS)
  ) {
    answerPromise = () =>
      Promise.resolve(getAnswerFromRagCalls(allCall, query.id));
  } else {
    answerPromise = () => getAnswerFromQueryAndAnswerSheet(doc, query);
  }
  if (!answerPromise) {
    return Promise.resolve({ answer: "", metadata });
  }
  return answerPromise()
    .then((answer) => {
      return { answer, metadata };
    })
    .catch((e) => {
      alert(e);
      return { answer: "", metadata };
    });
}

/**
 * Absolutely positions the tooltip within the given annotation so it fits
 * within the parent query section.
 */
function adjustTooltipPosition(annotationEl: Element): void {
  const tooltipEl = annotationEl.querySelector(
    ".dc-stat-tooltip"
  ) as HTMLDivElement;
  const parentSection = annotationEl.closest("#query-section");
  const sectionRect = parentSection.getBoundingClientRect();
  const sectionBorderWidth = 1;

  // Limit tooltip width to section width.
  if (
    tooltipEl.getBoundingClientRect().width >
    sectionRect.width - 2 * sectionBorderWidth
  ) {
    tooltipEl.style.maxWidth = `${
      sectionRect.width - 2 * sectionBorderWidth
    }px`;
  }

  // Re-calculate since tooltip width may have changed.
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width;

  // All tooltip positioning is relative to the annotation el's left edge.
  const annotationRect = annotationEl.getBoundingClientRect();
  const tooltipReferencePoint = annotationRect.left;

  // By default, center tooltip over annotation.
  let newTooltipLeft = -0.5 * (tooltipWidth - annotationRect.width);
  if (
    newTooltipLeft + tooltipReferencePoint <
    sectionRect.left + sectionBorderWidth
  ) {
    // Shift tooltip if it is cut off by the left edge of the section.
    newTooltipLeft =
      sectionRect.left + sectionBorderWidth - tooltipReferencePoint;
  } else if (
    newTooltipLeft + tooltipReferencePoint + tooltipWidth >
    sectionRect.right - sectionBorderWidth
  ) {
    // Shift tooltip if it is cut off by the right edge of the section.
    newTooltipLeft =
      sectionRect.right -
      sectionBorderWidth -
      tooltipWidth -
      tooltipReferencePoint;
  }
  tooltipEl.style.left = `${newTooltipLeft}px`;
}

/**
 * Removes any absolute positioning applied by adjustTooltipPosition.
 */
function resetTooltipPosition(annotationEl: Element): void {
  const tooltipEl = annotationEl.querySelector(
    ".dc-stat-tooltip"
  ) as HTMLDivElement;
  tooltipEl.style.left = null;
  tooltipEl.style.maxWidth = null;
}

interface QuerySectionPropType {
  doc: GoogleSpreadsheet;
  evalType: EvalType;
  feedbackStage: FeedbackStage;
  query: Query;
  callId?: number;
  allCall?: Record<number, DcCalls>;
  hideIdAndQuestion?: boolean;
}

export function QuerySection(props: QuerySectionPropType): JSX.Element {
  const [displayedAnswer, setDisplayedAnswer] = useState<string>(
    ANSWER_LOADING_MESSAGE
  );
  const prevHighlightedRef = useRef<HTMLSpanElement | null>(null);
  const answerMetadata = useRef<AnswerMetadata>(null);

  // Add window-level click handling for showing/hiding annotation tooltips.
  useEffect(() => {
    // Only show tooltips for RIG evals.
    if (props.evalType !== EvalType.RIG) return;

    const onClick = (e: MouseEvent): void => {
      const clickedEl = e.target as Element;

      // Don't change active annotation if the tooltip itself is clicked.
      if (clickedEl.closest(".dc-stat-tooltip")) return;

      const activeAnnotationEl = document.querySelector(
        `.${ACTIVE_ANNOTATION_CLASSNAME}`
      ) as HTMLSpanElement | null;

      // Deactivate any active annotation.
      if (activeAnnotationEl) {
        activeAnnotationEl.classList.remove(ACTIVE_ANNOTATION_CLASSNAME);
        resetTooltipPosition(activeAnnotationEl);
      }

      // If the previously active annotation was clicked, don't reactivate it.
      if (clickedEl === activeAnnotationEl) return;

      // Otherwise, if an annotation was clicked, activate it.
      if (clickedEl.classList.contains("annotation")) {
        clickedEl.classList.add(ACTIVE_ANNOTATION_CLASSNAME);
        adjustTooltipPosition(clickedEl);
      }
    };

    window.addEventListener("click", onClick);

    // Remove the event listener when the component unmounts.
    return () => {
      if (props.evalType !== EvalType.RIG) return;
      window.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    // Remove highlight from previous annotation
    if (prevHighlightedRef.current) {
      prevHighlightedRef.current.classList.remove("highlight");
    }

    // Only highlight calls in call stage
    if (props.feedbackStage !== FeedbackStage.CALLS) {
      return;
    }

    // Highlight the new annotation. Note the display index is 1 based.
    const newHighlighted = document.querySelector(
      `.annotation-${props.callId}`
    ) as HTMLSpanElement;
    if (newHighlighted) {
      newHighlighted.classList.add("highlight");
      prevHighlightedRef.current = newHighlighted;
    }
  }, [displayedAnswer, props.callId, props.feedbackStage]);

  useEffect(() => {
    if (!props.query) {
      setDisplayedAnswer("");
      return;
    }
    setDisplayedAnswer(ANSWER_LOADING_MESSAGE);
    answerMetadata.current = {
      evalType: props.evalType,
      feedbackStage: props.feedbackStage,
      queryId: props.query.id,
    };
    let subscribed = true;
    getAnswer(
      props.doc,
      props.query,
      props.allCall,
      props.evalType,
      props.feedbackStage
    )
      .then(({ answer, metadata }) => {
        if (!subscribed) return;
        // Only set answer if it matches the current answer metadata
        if (_.isEqual(answerMetadata.current, metadata)) {
          const calls =
            props.query && props.allCall ? props.allCall[props.query.id] : null;
          setDisplayedAnswer(processText(answer, calls));
        }
      })
      .catch(() => void setDisplayedAnswer("Failed to load answer."));
    return () => void (subscribed = false);
  }, [props]);

  if (!props.query) {
    return null;
  }

  const answerHeading =
    (props.feedbackStage === FeedbackStage.CALLS &&
      props.evalType === EvalType.RAG) ||
    props.feedbackStage === FeedbackStage.OVERALL_QUESTIONS
      ? "Questions to Data Commons"
      : "Answer";

  return (
    <div id="query-section">
      {!props.hideIdAndQuestion && <h3>Query {props.query.id}</h3>}
      {!props.hideIdAndQuestion && <p>{props.query.text}</p>}
      <h3>{answerHeading}</h3>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw as any]}
        remarkPlugins={[remarkGfm]}
      >
        {displayedAnswer}
      </ReactMarkdown>
    </div>
  );
}
