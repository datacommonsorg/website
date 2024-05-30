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
import React, { useEffect, useState } from "react";
import { Button } from "reactstrap";

import {
  DC_CALL_SHEET,
  DC_QUESTION_COL,
  DC_RESPONSE_COL,
  DC_STAT_COL,
  LLM_STAT_COL,
} from "./constants";
import { EvalInfo, FeedbackForm } from "./feedback_form";

export interface DcCall {
  callId: string;
  rowIdx: number;
}

export interface EvalSectionProps {
  doc: GoogleSpreadsheet;
  calls: DcCall[];
}

export function EvalSection(props: EvalSectionProps): JSX.Element {
  const [evalInfo, setEvalInfo] = useState<EvalInfo | null>(null);
  const [callIdx, setCallIdx] = useState<number>(0);

  useEffect(() => {
    const sheet = props.doc.sheetsByTitle[DC_CALL_SHEET];
    const rowIdx = props.calls[callIdx].rowIdx;
    sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
      const row = rows[0];
      if (row) {
        setEvalInfo({
          question: row.get(DC_QUESTION_COL),
          dcResponse: row.get(DC_RESPONSE_COL),
          llmResponse: row.get(LLM_STAT_COL),
          dcStat: row.get(DC_STAT_COL),
        });
      }
    });
  }, [props.doc, props.calls, callIdx]);

  const previous = () => {
    if (callIdx > 0) {
      setCallIdx(callIdx - 1);
    }
  };

  const next = () => {
    if (callIdx < props.calls.length - 1) {
      setCallIdx(callIdx + 1);
    }
  };

  return (
    <>
      {evalInfo && <FeedbackForm evalInfo={evalInfo} />}
      <div>
        <span>
          {callIdx + 1} / {props.calls.length} ITEMS IN THIS QUERY
        </span>
        <Button
          className={callIdx === 0 ? "disabled" : ""}
          onClick={() => {
            previous();
          }}
        >
          Previous
        </Button>
        <Button
          className={callIdx === props.calls.length - 1 ? "disabled" : ""}
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
