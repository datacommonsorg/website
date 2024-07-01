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
import React, { useContext, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import {
  ANSWER_COL,
  DC_CALL_SHEET,
  DC_QUESTION_COL,
  DC_RESPONSE_COL,
  QA_SHEET,
} from "./constants";
import { AppContext, SessionContext } from "./context";
import { getSheetsRows } from "./data_store";
import { DcCall, EvalType, FeedbackStage, Query } from "./types";
import { processText } from "./util";

interface AnswerMetadata {
  evalType: EvalType;
  feedbackStage: FeedbackStage;
  sessionQueryId: number;
}

function getFormattedRagCallAnswer(
  dcQuestion: string,
  dcStat: string,
  tableId: string
): string {
  const formattedQuestion = `<span class="dc-question">**${dcQuestion}**</span>`;
  const formattedStat = `<span class="dc-stat">${dcStat} \xb7 Table ${tableId}</span>`;
  return `<span class="annotation annotation-rag annotation-${tableId}">${formattedQuestion}<br/>${formattedStat}</span>`;
}

function getAnswerFromRagCalls(
  doc: GoogleSpreadsheet,
  allCall: Record<number, DcCall>,
  sessionQueryId: number
): Promise<string> {
  if (!allCall[sessionQueryId]) {
    return Promise.resolve("");
  }
  const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
  const tableIds = Object.keys(allCall[sessionQueryId]).sort(
    (a, b) => Number(a) - Number(b)
  );
  const rowIdxList = tableIds.map(
    (tableId) => allCall[sessionQueryId][tableId]
  );
  return getSheetsRows(sheet, rowIdxList).then((rows) => {
    const answers = [];
    tableIds.forEach((tableId) => {
      const rowIdx = allCall[sessionQueryId][tableId];
      const row = rows[rowIdx];
      if (row) {
        const dcQuestion = row.get(DC_QUESTION_COL);
        const dcStat = row.get(DC_RESPONSE_COL);
        answers.push(getFormattedRagCallAnswer(dcQuestion, dcStat, tableId));
      }
    });
    return answers.join("\n\n");
  });
}

function getAnswerFromQA(
  doc: GoogleSpreadsheet,
  allQuery: Record<number, Query>,
  sessionQueryId: number
): Promise<string> {
  const sheet = doc.sheetsByTitle[QA_SHEET];
  const rowIdx = allQuery[sessionQueryId].row;
  return sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
    const row = rows[0];
    if (row) {
      return row.get(ANSWER_COL) || "";
    }
  });
}

function getAnswer(
  doc: GoogleSpreadsheet,
  allQuery: Record<number, Query>,
  allCall: Record<number, DcCall>,
  evalType: EvalType,
  feedbackStage: FeedbackStage,
  sessionQueryId: number
): Promise<{ answer: string; metadata: AnswerMetadata }> {
  const metadata = {
    evalType,
    feedbackStage,
    sessionQueryId,
  };
  let answerPromise = null;
  if (evalType === EvalType.RIG) {
    answerPromise = () => getAnswerFromQA(doc, allQuery, sessionQueryId);
  } else {
    // RAG eval type has different things that should be shown in this section
    // depending on the feedback stage
    if (
      feedbackStage === FeedbackStage.CALLS ||
      feedbackStage === FeedbackStage.OVERALL_QUESTIONS
    ) {
      answerPromise = () => getAnswerFromRagCalls(doc, allCall, sessionQueryId);
    } else {
      answerPromise = () => getAnswerFromQA(doc, allQuery, sessionQueryId);
    }
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

export function QuerySection(): JSX.Element {
  const { allCall, allQuery, doc, evalType } = useContext(AppContext);
  const { sessionQueryId, sessionCallId, feedbackStage } =
    useContext(SessionContext);
  const [answer, setAnswer] = useState<string>("");
  const prevHighlightedRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Remove highlight from previous annotation
    if (prevHighlightedRef.current) {
      prevHighlightedRef.current.classList.remove("highlight");
    }

    // Only highlight calls in call stage
    if (feedbackStage !== FeedbackStage.CALLS) {
      return;
    }

    // Highlight the new annotation. Note the display index is 1 based.
    const newHighlighted = document.querySelector(
      `.annotation-${sessionCallId}`
    ) as HTMLSpanElement;
    if (newHighlighted) {
      newHighlighted.classList.add("highlight");
      prevHighlightedRef.current = newHighlighted;
    }
  }, [answer, sessionCallId, feedbackStage]);

  useEffect(() => {
    getAnswer(
      doc,
      allQuery,
      allCall,
      evalType,
      feedbackStage,
      sessionQueryId
    ).then(({ answer, metadata }) => {
      // Set empty answer if metadata doesn't match current state.
      if (
        metadata.evalType !== evalType ||
        metadata.feedbackStage !== feedbackStage ||
        metadata.sessionQueryId !== sessionQueryId
      ) {
        return;
      } else {
        setAnswer(answer);
      }
    });
  }, [doc, allQuery, sessionQueryId, evalType, feedbackStage]);

  const answerHeading =
    (feedbackStage === FeedbackStage.CALLS && evalType === EvalType.RAG) ||
    feedbackStage === FeedbackStage.OVERALL_QUESTIONS
      ? "Questions to Data Commons"
      : "Answer";

  return (
    <div id="query-section">
      <h3>Query {sessionQueryId}</h3>
      <p>{allQuery[sessionQueryId].text}</p>
      <h3>{answerHeading}</h3>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw as any]}
        remarkPlugins={[remarkGfm]}
      >
        {processText(answer)}
      </ReactMarkdown>
    </div>
  );
}
