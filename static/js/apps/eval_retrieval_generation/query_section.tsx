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
import { EvalType, FeedbackStage } from "./types";
import { processText } from "./util";

export function QuerySection(): JSX.Element {
  const { allCall, allQuery, doc, evalType } = useContext(AppContext);
  const { sessionQueryId, sessionCallId, feedbackStage } =
    useContext(SessionContext);

  const [answer, setAnswer] = useState<string>("");
  const prevHighlightedRef = useRef<HTMLSpanElement | null>(null);

  const loadAnswer = (doc: GoogleSpreadsheet, rowIdx: number) => {
    const sheet = doc.sheetsByTitle[QA_SHEET];
    sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
      const row = rows[0];
      if (row) {
        setAnswer(row.get(ANSWER_COL));
      }
    });
  };

  const loadRagCalls = () => {
    if (!allCall[sessionQueryId]) {
      setAnswer("");
      return;
    }
    const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
    const tableIds = Object.keys(allCall[sessionQueryId]).sort(
      (a, b) => Number(a) - Number(b)
    );
    const rowPromises = tableIds.map((tableId) => {
      const rowIdx = allCall[sessionQueryId][tableId];
      return sheet.getRows({ offset: rowIdx - 1, limit: 1 });
    });
    Promise.all(rowPromises).then((rowsList) => {
      const answers = [];
      rowsList.forEach((rows, i) => {
        const row = rows[0];
        const rowQ = `<span class="dc-question">**${row.get(
          DC_QUESTION_COL
        )}**</span>`;
        const rowA = `<span class="dc-stat">${row.get(
          DC_RESPONSE_COL
        )} \xb7 Table ${tableIds[i]}</span>`;
        answers.push(
          `<span class="annotation annotation-rag annotation-${tableIds[i]}">${rowQ}<br/>${rowA}</span>`
        );
      });
      setAnswer(answers.join("\n\n"));
    });
  };

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
  }, [answer, sessionCallId]);

  useEffect(() => {
    if (evalType === EvalType.RIG) {
      loadAnswer(doc, allQuery[sessionQueryId].row);
    } else {
      // RAG eval type has different things that should be shown in this section
      // depending on the feedback stage
      if (feedbackStage === FeedbackStage.CALLS) {
        loadRagCalls();
      } else {
        loadAnswer(doc, allQuery[sessionQueryId].row);
      }
    }
  }, [doc, allQuery, sessionQueryId, evalType, feedbackStage]);

  const answerHeading =
    feedbackStage === FeedbackStage.CALLS && evalType === EvalType.RAG
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
