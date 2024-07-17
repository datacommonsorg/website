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

import {
  ANSWER_COL,
  DC_CALL_SHEET,
  DC_QUESTION_COL,
  DC_RESPONSE_COL,
  QA_SHEET,
} from "./constants";
import { getSheetsRows } from "./data_store";
import { DcCall, EvalType, FeedbackStage, Query } from "./types";
import { processText } from "./util";

interface AnswerMetadata {
  evalType: EvalType;
  feedbackStage: FeedbackStage;
  queryId: number;
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
  queryId: number
): Promise<string> {
  if (!allCall[queryId]) {
    return Promise.resolve("No questions were generated.");
  }
  const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
  const tableIds = Object.keys(allCall[queryId]).sort(
    (a, b) => Number(a) - Number(b)
  );
  const rowIdxList = tableIds.map((tableId) => allCall[queryId][tableId]);
  return getSheetsRows(sheet, rowIdxList).then((rows) => {
    const answers = [];
    tableIds.forEach((tableId) => {
      const rowIdx = allCall[queryId][tableId];
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
  query: Query
): Promise<string> {
  const sheet = doc.sheetsByTitle[QA_SHEET];
  const rowIdx = query.row;
  return sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
    const row = rows[0];
    if (row) {
      return row.get(ANSWER_COL) || "";
    }
  });
}

function getAnswer(
  doc: GoogleSpreadsheet,
  query: Query,
  allCall: Record<number, DcCall>,
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
    answerPromise = () => getAnswerFromRagCalls(doc, allCall, query.id);
  } else {
    answerPromise = () => getAnswerFromQA(doc, query);
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

interface QuerySectionPropType {
  doc: GoogleSpreadsheet;
  evalType: EvalType;
  feedbackStage: FeedbackStage;
  query: Query;
  callId?: number;
  allCall?: Record<number, DcCall>;
  hideIdAndQuestion?: boolean;
}

export function QuerySection(props: QuerySectionPropType): JSX.Element {
  const [answer, setAnswer] = useState<string>("");
  const prevHighlightedRef = useRef<HTMLSpanElement | null>(null);
  const answerMetadata = useRef<AnswerMetadata>(null);

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
  }, [answer, props.callId, props.feedbackStage]);

  useEffect(() => {
    if (!props.query) {
      setAnswer("");
      return;
    }
    answerMetadata.current = {
      evalType: props.evalType,
      feedbackStage: props.feedbackStage,
      queryId: props.query.id,
    };
    getAnswer(
      props.doc,
      props.query,
      props.allCall,
      props.evalType,
      props.feedbackStage
    ).then(({ answer, metadata }) => {
      // Only set answer if it matches the current answer metadata
      if (_.isEqual(answerMetadata.current, metadata)) {
        setAnswer(answer);
      }
    });
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
        {processText(answer)}
      </ReactMarkdown>
    </div>
  );
}
