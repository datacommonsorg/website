/**
 * Copyright 2022 Google LLC
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

/**
 * Component to show csv data in a table
 */

import React from "react";

import { CsvData } from "../types";

const EMPTY_ROW_INDICATOR = -1;
const EMPTY_ROW_FILLER = "...";

interface PreviewTableProps {
  csvData: CsvData;
}

export function PreviewTable(props: PreviewTableProps): JSX.Element {
  const orderedDataRows = Array.from(props.csvData.rowsForDisplay.keys()).sort(
    (a, b) => {
      if (a > b) {
        return 1;
      } else if (a < b) {
        return -1;
      } else {
        return 0;
      }
    }
  );
  // The array index of the index we want to add an empty row at
  const emptyRowIdx = orderedDataRows.findIndex((rowIdx, idx) =>
    idx === 0 ? false : rowIdx > orderedDataRows[idx - 1] + 1
  );
  orderedDataRows.splice(emptyRowIdx, 0, EMPTY_ROW_INDICATOR);

  return (
    <div className="file-preview-section">
      <div className="file-preview-name">
        <b>Your File: </b>
        {props.csvData ? props.csvData.rawCsvFile.name : "No file chosen"}
      </div>
      <table>
        <thead>
          <tr>
            <th>{props.csvData.headerRow}</th>
            {props.csvData.orderedColumns.map((col) => {
              return <th key={col.columnIdx}>{col.header}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {orderedDataRows.map((csvRowNum, rowIdx) => {
            const csvRow =
              csvRowNum === EMPTY_ROW_INDICATOR
                ? new Array(props.csvData.orderedColumns.length).fill(
                    EMPTY_ROW_FILLER
                  )
                : props.csvData.rowsForDisplay.get(csvRowNum);
            const rowNum =
              csvRowNum === EMPTY_ROW_INDICATOR ? EMPTY_ROW_FILLER : csvRowNum;
            return (
              <tr key={`row-${rowIdx}`}>
                <td className="row-num">{rowNum.toString()}</td>
                {csvRow.map((cell, cellIdx) => {
                  return <td key={`row-${rowIdx}-cell-${cellIdx}`}>{cell}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
