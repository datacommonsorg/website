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
    const callSheet = props.doc.sheetsByTitle["dc_calls"];
    const filter = [];
    filter.push(`C${props.rowIdx + 1}:F${props.rowIdx + 1}`);
    callSheet.loadCells(filter).then(() => {
      setDcQuestion(
        callSheet.getCellByA1(`C${props.rowIdx + 1}`).value as string
      );
      setDcAnswer(
        callSheet.getCellByA1(`D${props.rowIdx + 1}`).value as string
      );
      setLlmStat(callSheet.getCellByA1(`E${props.rowIdx + 1}`).value as string);
      setDcStat(callSheet.getCellByA1(`F${props.rowIdx + 1}`).value as string);
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
