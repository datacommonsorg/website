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

import {
  DC_CALL_SHEET,
  DC_QUESTION_COL,
  DC_RESPONSE_COL,
  DC_STAT_COL,
  LLM_STAT_COL,
} from "./constants";

export interface EvalSectionProps {
  doc: GoogleSpreadsheet;
  rowIdx: number;
}

export function EvalSection(props: EvalSectionProps): JSX.Element {
  const [dcQuestion, setDcQuestion] = useState<string>("");
  const [dcAnswer, setDcAnswer] = useState<string>("");
  const [llmStat, setLlmStat] = useState<string>("");
  const [dcStat, setDcStat] = useState<string>("");

  useEffect(() => {
    const sheet = props.doc.sheetsByTitle[DC_CALL_SHEET];
    sheet.getRows({ offset: props.rowIdx - 1, limit: 1 }).then((rows) => {
      const row = rows[0];
      if (row) {
        setDcQuestion(row.get(DC_QUESTION_COL));
        setDcAnswer(row.get(DC_RESPONSE_COL));
        setLlmStat(row.get(LLM_STAT_COL));
        setDcStat(row.get(DC_STAT_COL));
      }
    });
  }, [props.doc, props.rowIdx]);

  return (
    <div className="eval-section">
      <p>dcQuestion: {dcQuestion}</p>
      <p>dcAnswer: {dcAnswer}</p>
      <p>llmStat: {llmStat}</p>
      <p>dcStat: {dcStat}</p>
    </div>
  );
}
