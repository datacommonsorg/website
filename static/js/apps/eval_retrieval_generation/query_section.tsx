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

import { ANSWER_COL, QA_SHEET } from "./constants";
import { AppContext, SessionContext } from "./context";
import { processText } from "./util";

export function QuerySection(): JSX.Element {
  const { allQuery, doc } = useContext(AppContext);
  const { sessionQueryId, sessionCallId } = useContext(SessionContext);

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

  useEffect(() => {
    // Remove highlight from previous annotation
    if (prevHighlightedRef.current) {
      prevHighlightedRef.current.classList.remove("highlight");
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
    loadAnswer(doc, allQuery[sessionQueryId].row);
  }, [doc, allQuery, sessionQueryId]);

  return (
    <div id="query-section">
      <h3>Query {sessionQueryId}</h3>
      <p>{allQuery[sessionQueryId].text}</p>
      <h3>Answer</h3>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw as any]}
        remarkPlugins={[remarkGfm]}
      >
        {processText(answer)}
      </ReactMarkdown>
    </div>
  );
}
