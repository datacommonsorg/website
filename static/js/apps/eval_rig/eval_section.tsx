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

import React, { useContext, useEffect, useRef, useState } from "react";
import { Button } from "reactstrap";

import {
  DC_CALL_SHEET,
  DC_QUESTION_COL,
  DC_RESPONSE_COL,
  DC_STAT_COL,
  LLM_STAT_COL,
} from "./constants";
import { AppContext } from "./context";
import { EvalInfo, FeedbackForm } from "./feedback_form";

export interface DcCall {
  id: string;
  row: number;
}

export interface EvalSectionProps {
  queryId: string;
  calls: DcCall[];
}

export function EvalSection(props: EvalSectionProps): JSX.Element {
  const { doc } = useContext(AppContext);
  const prevHighlightedRef = useRef<HTMLSpanElement | null>(null);
  const [evalInfo, setEvalInfo] = useState<EvalInfo | null>(null);
  const [callPos, setCallPos] = useState<number>(0);

  useEffect(() => {
    const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
    const rowIdx = props.calls[callPos].row;
    sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
      const row = rows[0];
      if (row) {
        setEvalInfo({
          question: row.get(DC_QUESTION_COL),
          dcResponse: row.get(DC_RESPONSE_COL),
          llmStat: row.get(LLM_STAT_COL),
          dcStat: row.get(DC_STAT_COL),
        });
      }
    });
  }, [doc, props.calls, callPos]);

  // Highlight the current DC Call in the answer section.
  useEffect(() => {
    // Remove highlight from previous annotation
    if (prevHighlightedRef.current) {
      prevHighlightedRef.current.classList.remove("highlight");
    }

    // Highlight the new annotation. Note the display index is 1 based.
    const newHighlighted = document.querySelector(
      `.annotation-${callPos + 1}`
    ) as HTMLSpanElement;
    if (newHighlighted) {
      newHighlighted.classList.add("highlight");
      prevHighlightedRef.current = newHighlighted;
    }
  }, [callPos]);

  const previous = () => {
    if (callPos > 0) {
      setCallPos(callPos - 1);
    }
  };

  const next = () => {
    if (callPos < props.calls.length - 1) {
      setCallPos(callPos + 1);
    }
  };

  return (
    <>
      {evalInfo && (
        <FeedbackForm
          queryId={props.queryId}
          callId={props.calls[callPos].id}
          evalInfo={evalInfo}
        />
      )}
      <div>
        <span>
          {callPos + 1} / {props.calls.length} ITEMS IN THIS QUERY
        </span>
        <Button
          className={callPos === 0 ? "disabled" : ""}
          onClick={() => {
            previous();
          }}
        >
          Previous
        </Button>
        <Button
          className={callPos === props.calls.length - 1 ? "disabled" : ""}
          onClick={() => {
            next();
          }}
        >
          Next
        </Button>
      </div>
    </>
  );
}
