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

import {
  ANSWER_COL,
  CALL_ID_COL,
  DC_CALL_SHEET,
  DC_METADATA_SHEET,
  DC_QUESTION_COL,
  DC_RESPONSE_COL,
  DC_STAT_COL,
  FEEDBACK_STAGE_LIST,
  LLM_STAT_COL,
  METADATA_KEY_COL,
  METADATA_KEY_TYPE,
  METADATA_VAL_COL,
  QA_SHEET,
  QUERY_COL,
  QUERY_ID_COL,
  USER_COL,
} from "./constants";
import {
  AllQuery,
  DcCalls,
  DocInfo,
  EvalType,
  FeedbackStage,
  Query,
} from "./types";

const HTTP_PATTERN = /https:\/\/[^\s]+/g;
const LONG_SPACES = "&nbsp;&nbsp;&nbsp;&nbsp;";
// Assume a sequence of three or more dashes is the table divider.
const TABLE_DIVIDER_PATTERN = /[-]{3,}/g;
// Assume any sequence of 1 or more characters that are not pipes is a table
// header value.
const TABLE_HEADER_TEXT_PATTERN = /[^|]+/g;

// Map from sheet name to column name to column index
type HeaderInfo = Record<string, Record<string, number>>;

export const processText = (text: string, calls?: DcCalls): string => {
  if (!text) {
    return "";
  }
  // If "Answer" is in the text, remove it
  let processedText = text.replace("Answer:", "");
  // If "FOOTNOTES" in all caps is in the text, convert it to lower case
  processedText = processedText.replace("FOOTNOTES", "Footnotes");
  processedText = processedText.replace(
    // Replace [__DC__#1(dc stat text||llm stat text)] to
    // dc stat text||llm stat text with html and css annotations.
    /\[\s*__DC__#(\d+)\((.*?)\)\]/g,
    (_, callId, content) => {
      // Split the second capturing group by "||"
      const parts = content.split("||");
      let dcStat: string;
      let llmStat: string;
      if (parts.length === 2) {
        dcStat = parts[0];
        llmStat = parts[1];
      } else {
        llmStat = parts[0];
      }

      let innerHtml = "";
      innerHtml += `<span class="llm-stat">${llmStat || LONG_SPACES}</span>`;
      let annotationClasses = `annotation annotation-${callId}`;

      const hasDcStat = dcStat?.trim().length > 0;
      if (hasDcStat) {
        innerHtml += getTooltipHtml(dcStat, callId, calls);
      } else {
        annotationClasses += " annotation-no-dc-stat";
      }

      return `<span class="${annotationClasses}">${innerHtml}</span>`;
    }
  );
  // Replace each link with the desired HTML format
  return processedText.replace(
    HTTP_PATTERN,
    (match) => `<a href="${match}" target="_blank">Explore Page</a><br> `
  );
};

function getTooltipHtml(
  dcStat: string,
  callId: string,
  calls?: DcCalls
): string {
  let dcResponse = "";
  if (calls) {
    dcResponse = calls[callId]?.dcResponse || "";
  }
  return (
    `<span class="dc-stat-tooltip">` +
    `<span class="dc-stat-tooltip-value">${dcStat}</span>` +
    `<br/>` +
    `<span class="dc-stat-tooltip-label">${dcResponse}</span>` +
    `</span>`
  );
}

export function processTableText(text: string): string {
  if (!text) {
    return "";
  }
  // Get a copy of the table header
  const tableHeader = _.cloneDeep(text).split("\n", 1)[0];
  // Replace all the text in the header with "-" to create the table divider
  // example: abc | cd -> -|-
  const tableDivider = tableHeader.replace(TABLE_HEADER_TEXT_PATTERN, "-");
  // Replace the table divider that's originally in the text with the one just
  // created
  return text.replace(TABLE_DIVIDER_PATTERN, tableDivider);
}

// Get the first feedback stage to show for an eval type
export function getFirstFeedbackStage(evalType: EvalType): FeedbackStage {
  return FEEDBACK_STAGE_LIST[evalType][0];
}

async function getHeader(doc: GoogleSpreadsheet): Promise<HeaderInfo> {
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

function getQueries(
  doc: GoogleSpreadsheet,
  allHeader: HeaderInfo
): Promise<AllQuery> {
  const sheet = doc.sheetsByTitle[QA_SHEET];
  const header = allHeader[QA_SHEET];
  const numRows = sheet.rowCount;
  return sheet.loadCells().then(() => {
    const allQuery: Record<number, Query> = {};
    for (let i = 1; i < numRows; i++) {
      const id = Number(sheet.getCell(i, header[QUERY_ID_COL]).value);
      // Skip row if query ID is 0 or NaN.
      if (!id) continue;
      allQuery[id] = {
        id,
        rowIndex: i,
        text: String(sheet.getCell(i, header[QUERY_COL]).value),
        user: String(sheet.getCell(i, header[USER_COL]).value),
      };
    }
    return allQuery;
  });
}

function getCalls(
  doc: GoogleSpreadsheet,
  allHeader: HeaderInfo
): Promise<Record<number, DcCalls>> {
  const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
  const header = allHeader[DC_CALL_SHEET];
  const numRows = sheet.rowCount;
  return sheet.loadCells().then(() => {
    const calls: Record<number, DcCalls> = {};
    for (let i = 1; i < numRows; i++) {
      const queryId = Number(sheet.getCell(i, header[QUERY_ID_COL]).value);
      const callId = Number(sheet.getCell(i, header[CALL_ID_COL]).value);
      if (!calls[queryId]) {
        calls[queryId] = {};
      }
      calls[queryId][callId] = {
        rowIndex: i,
        question:
          sheet.getCell(i, header[DC_QUESTION_COL]).formattedValue || "",
        llmStat: sheet.getCell(i, header[LLM_STAT_COL]).formattedValue || "",
        dcResponse:
          sheet.getCell(i, header[DC_RESPONSE_COL]).formattedValue || "",
        dcStat: sheet.getCell(i, header[DC_STAT_COL]).formattedValue || "",
      };
    }
    return calls;
  });
}

function getEvalType(
  doc: GoogleSpreadsheet,
  allHeader: HeaderInfo
): Promise<EvalType> {
  const sheet = doc.sheetsByTitle[DC_METADATA_SHEET];
  const header = allHeader[DC_METADATA_SHEET];
  const numRows = sheet.rowCount;
  return sheet.loadCells().then(() => {
    for (let i = 1; i < numRows; i++) {
      const metadataKey = sheet.getCell(i, header[METADATA_KEY_COL]).value;
      if (metadataKey === METADATA_KEY_TYPE) {
        const evalType = sheet.getCell(i, header[METADATA_VAL_COL])
          .value as EvalType;
        return evalType;
      }
    }
    alert(
      "Could not find an eval type in the sheet metadata. Please update the sheet and try again."
    );
  });
}

// Promise to get all the information about a google spreadsheet doc
export function getDocInfo(doc: GoogleSpreadsheet): Promise<DocInfo> {
  return getHeader(doc)
    .then((allHeader) => {
      return Promise.all([
        getQueries(doc, allHeader),
        getCalls(doc, allHeader),
        getEvalType(doc, allHeader),
      ]);
    })
    .then(([allQuery, allCall, evalType]) => {
      return { doc, allQuery, allCall, evalType };
    });
}

// Promise to get the answer for a query from the query and answer sheet in a
// google spreadsheet.
export function getAnswerFromQueryAndAnswerSheet(
  doc: GoogleSpreadsheet,
  query: Query
): Promise<string> {
  const sheet = doc.sheetsByTitle[QA_SHEET];
  const rowIdx = query.rowIndex;
  return sheet.getRows({ offset: rowIdx - 1, limit: 1 }).then((rows) => {
    const row = rows[0];
    if (row) {
      return row.get(ANSWER_COL) || "";
    }
  });
}
