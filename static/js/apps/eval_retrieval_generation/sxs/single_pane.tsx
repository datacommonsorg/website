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
  CALL_ID_COL,
  DC_CALL_SHEET,
  DC_METADATA_SHEET,
  METADATA_KEY_COL,
  METADATA_KEY_TYPE,
  METADATA_VAL_COL,
  QA_SHEET,
  QUERY_COL,
  QUERY_ID_COL,
  USER_COL,
} from "../constants";
import { QuerySection } from "../query_section";
import { TablePane } from "../table_pane";
import { DcCall, EvalType, FeedbackStage, Query } from "../types";

// Map from sheet name to column name to column index
type HeaderInfo = Record<string, Record<string, number>>;

interface SinglePanePropType {
  doc: GoogleSpreadsheet;
  queryId: number;
}

export function SinglePane(props: SinglePanePropType): JSX.Element {
  const [query, setQuery] = useState<Query>(null);
  const [calls, setCalls] = useState<DcCall>(null);
  const [evalType, setEvalType] = useState<EvalType>(null);

  // TODO: re-use methods from retrieval generation eval tool app.tsx. Also in
  //       the other load methods
  async function loadHeader(doc: GoogleSpreadsheet): Promise<HeaderInfo> {
    const result: HeaderInfo = {};
    for (const sheetName of [QA_SHEET, DC_CALL_SHEET, DC_METADATA_SHEET]) {
      result[sheetName] = {};
      const sheet = doc.sheetsByTitle[sheetName];
      await sheet.loadHeaderRow();
      for (let i = 0; i < sheet.headerValues.length; i++) {
        const colName = sheet.headerValues[i];
        result[sheetName][colName] = i;
      }
    }
    return result;
  }

  const loadQuery = (doc: GoogleSpreadsheet, allHeader: HeaderInfo) => {
    const sheet = doc.sheetsByTitle[QA_SHEET];
    const header = allHeader[QA_SHEET];
    const numRows = sheet.rowCount;
    const loadPromises = [];
    for (const col of [QUERY_ID_COL, USER_COL, QUERY_COL]) {
      loadPromises.push(
        sheet.loadCells({
          endColumnIndex: header[col] + 1,
          startColumnIndex: header[col],
        })
      );
    }
    Promise.all(loadPromises).then(() => {
      for (let i = 1; i < numRows; i++) {
        const id = Number(sheet.getCell(i, header[QUERY_ID_COL]).value);
        if (id === props.queryId) {
          setQuery({
            id,
            row: i,
            text: String(sheet.getCell(i, header[QUERY_COL]).value),
            user: String(sheet.getCell(i, header[USER_COL]).value),
          });
          break;
        }
      }
    });
  };

  const loadCall = (doc: GoogleSpreadsheet, allHeader: HeaderInfo) => {
    const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
    const header = allHeader[DC_CALL_SHEET];
    const numRows = sheet.rowCount;
    const loadPromises = [];
    for (const col of [QUERY_ID_COL, CALL_ID_COL]) {
      loadPromises.push(
        sheet.loadCells({
          endColumnIndex: header[col] + 1,
          startColumnIndex: header[col],
        })
      );
    }
    Promise.all(loadPromises).then(() => {
      const tmp: DcCall = {};
      for (let i = 1; i < numRows; i++) {
        const row = i;
        const queryId = Number(sheet.getCell(i, header[QUERY_ID_COL]).value);
        if (queryId !== props.queryId) {
          continue;
        }
        const callId = Number(sheet.getCell(i, header[CALL_ID_COL]).value);
        tmp[callId] = row;
      }
      setCalls(tmp);
    });
  };

  const loadMetadata = (doc: GoogleSpreadsheet, allHeader: HeaderInfo) => {
    const sheet = doc.sheetsByTitle[DC_METADATA_SHEET];
    const header = allHeader[DC_METADATA_SHEET];
    const loadPromises = [];
    for (const col of [METADATA_KEY_COL, METADATA_VAL_COL]) {
      loadPromises.push(
        sheet.loadCells({
          endColumnIndex: header[col] + 1,
          startColumnIndex: header[col],
        })
      );
    }
    const numRows = sheet.rowCount;
    Promise.all(loadPromises).then(() => {
      for (let i = 1; i < numRows; i++) {
        const metadataKey = sheet.getCell(i, header[METADATA_KEY_COL]).value;
        if (metadataKey === METADATA_KEY_TYPE) {
          const evalType = sheet.getCell(i, header[METADATA_VAL_COL])
            .value as EvalType;
          setEvalType(evalType);
          return;
        }
      }
      alert(
        "Could not find an eval type in the sheet metadata. Please update the sheet and try again."
      );
    });
  };

  useEffect(() => {
    loadHeader(props.doc).then((allHeader) => {
      loadQuery(props.doc, allHeader);
      loadCall(props.doc, allHeader);
      loadMetadata(props.doc, allHeader);
    });
  }, [props]);

  if (!query || !calls || !evalType) {
    return null;
  }

  return (
    <div className="sxs-pane">
      <a
        href={`https://docs.google.com/spreadsheets/d/${props.doc.spreadsheetId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="google-sheet-link"
      >
        Google Sheet Link
      </a>
      <QuerySection
        doc={props.doc}
        evalType={evalType}
        feedbackStage={FeedbackStage.SXS}
        query={query}
      />
      {evalType === EvalType.RAG && <TablePane doc={props.doc} calls={calls} />}
    </div>
  );
}
