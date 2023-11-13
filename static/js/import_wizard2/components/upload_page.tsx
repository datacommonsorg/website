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
 * Component for the page for uploading data file
 */
import _ from "lodash";
import Papa from "papaparse";
import React, { useEffect, useState } from "react";
import { Button, Input } from "reactstrap";

import { Column, CsvData } from "../types";
import { PreviewTable } from "./preview_table";

const NUM_FIRST_ROWS = 3;
const NUM_LAST_ROWS = 3;
const MAX_COLUMN_SAMPLES = 100;
const DEFAULT_HEADER_ROW = 1;
const DEFAULT_FIRST_DATA_ROW = 2;
const UNDEFINED_LAST_DATA_ROW = -1;

interface UploadPageProps {
  uploadedFile: File;
  csvData: CsvData;
  onCsvDataUpdated: (csvData: CsvData) => void;
  onContinueClicked: () => void;
  onBackClicked: () => void;
}

export function UploadPage(props: UploadPageProps): JSX.Element {
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  // TODO: add input validation for headerRow, firstDataRow, and lastDataRow
  const [headerRowInput, setHeaderRowInput] = useState(
    props.csvData ? props.csvData.headerRow : DEFAULT_HEADER_ROW
  );
  const [firstDataRowInput, setFirstDataRowInput] = useState(
    props.csvData ? props.csvData.firstDataRow : DEFAULT_FIRST_DATA_ROW
  );
  const [lastDataRowInput, setLastDataRowInput] = useState(
    props.csvData ? props.csvData.lastDataRow : UNDEFINED_LAST_DATA_ROW
  );

  useEffect(() => {
    if (props.csvData && props.csvData.rawCsvFile === props.uploadedFile) {
      return;
    }
    setIsUpdatingData(true);
    processFile(props.uploadedFile, DEFAULT_HEADER_ROW, DEFAULT_FIRST_DATA_ROW);
  }, [props.csvData, props.uploadedFile]);

  return (
    <>
      <h2>Add File Details</h2>
      <div className="file-details-page-content">
        <div className="file-details-page-section">
          <div className="file-details-inputs">
            <div>Please add details to help us understand the dataset.</div>
            <div>*=required</div>
            {/* Input for header row */}
            <div className="file-options-input">
              <span>Header row:</span>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onFileOptionsSubmitted();
                }}
              >
                <Input
                  type="number"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setHeaderRowInput(val);
                  }}
                  onBlur={() => onFileOptionsSubmitted()}
                  value={headerRowInput}
                  min={1}
                />
              </form>
            </div>
            {/* Input for first data row */}
            <div className="file-options-input">
              <span>First data row:</span>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onFileOptionsSubmitted();
                }}
              >
                <Input
                  type="number"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFirstDataRowInput(val);
                  }}
                  onBlur={() => onFileOptionsSubmitted()}
                  value={firstDataRowInput}
                  min={1}
                />
              </form>
            </div>
            {/* Input for last data row */}
            <div className="file-options-input">
              <span>Last data row:</span>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onFileOptionsSubmitted();
                }}
              >
                <Input
                  type="number"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLastDataRowInput(val);
                  }}
                  onBlur={() => onFileOptionsSubmitted()}
                  value={lastDataRowInput}
                  min={1}
                />
              </form>
            </div>
          </div>
          <div className="navigation-section">
            <Button className="nav-btn" onClick={props.onBackClicked}>
              Back
            </Button>
            <Button className="nav-btn" onClick={props.onContinueClicked}>
              Continue
            </Button>
          </div>
        </div>
        <div className="file-details-page-section">
          {!_.isEmpty(props.csvData) && (
            <PreviewTable csvData={props.csvData}></PreviewTable>
          )}
          <div style={{ display: isUpdatingData ? "block" : "none" }}>
            <div id="spinner"></div>
          </div>
        </div>
      </div>
    </>
  );

  function getOrderedColumns(headerRowVals: string[]): Column[] {
    const uniqueHeaders = new Set();
    headerRowVals.forEach((header) => {
      if (uniqueHeaders.has(header)) {
        uniqueHeaders.delete(header);
      } else {
        uniqueHeaders.add(header);
      }
    });
    const orderedColumns = [];
    headerRowVals.forEach((header, idx) => {
      // column id will be the same as header if header is unique, otherwise,
      // auto generate the column id.
      const colId = uniqueHeaders.has(header) ? header : `${header}_${idx}`;
      orderedColumns.push({
        columnIdx: idx,
        header,
        id: colId,
      });
    });
    return orderedColumns;
  }

  function onParseComplete(
    csv: CsvData,
    sampleColumnValues: Map<number, Set<string>>
  ): void {
    for (const colIdx of Array.from(sampleColumnValues.keys())) {
      csv.columnValuesSampled.set(
        colIdx,
        Array.from(sampleColumnValues.get(colIdx))
      );
    }
    props.onCsvDataUpdated(csv);
    if (csv.headerRow !== headerRowInput) {
      setHeaderRowInput(csv.headerRow);
    }
    if (csv.firstDataRow !== firstDataRowInput) {
      setFirstDataRowInput(csv.firstDataRow);
    }
    if (csv.lastDataRow !== lastDataRowInput) {
      setLastDataRowInput(csv.lastDataRow);
    }
    setIsUpdatingData(false);
  }

  function processFile(
    file: File,
    headerRow: number,
    firstDataRow: number,
    lastDataRow?: number
  ): void {
    const csv = {
      orderedColumns: [],
      columnValuesSampled: new Map(),
      rowsForDisplay: new Map(),
      rawCsvFile: file,
      headerRow,
      firstDataRow,
      lastDataRow,
      lastFileRow: -1,
    };
    // key is column idx
    const sampleColumnValues: Map<number, Set<string>> = new Map();
    let currRow = 1;
    Papa.parse(file, {
      complete: () => {
        // If last data row is undefined, it means user hasn't inputted what the
        // last row should be, so automatically use the last row in the csv
        if (_.isUndefined(lastDataRow)) {
          csv.lastDataRow = currRow - 1;
        }
        csv.lastFileRow = currRow - 1;
        onParseComplete(csv, sampleColumnValues);
      },
      error: () => {
        setIsUpdatingData(false);
        alert("sorry, there was a problem processing the uploaded file");
      },
      step: (result) => {
        if (currRow === headerRow) {
          csv.orderedColumns = getOrderedColumns(result.data as string[]);
          csv.orderedColumns.forEach((_, idx) => {
            sampleColumnValues.set(idx, new Set());
          });
        } else if (
          currRow >= firstDataRow &&
          (currRow <= lastDataRow || _.isUndefined(lastDataRow))
        ) {
          csv.rowsForDisplay.set(currRow, result.data);
          if (currRow - (firstDataRow - 1) > NUM_FIRST_ROWS + NUM_LAST_ROWS) {
            // remove the first row added that is not the first n rows or the
            // last n rows.
            csv.rowsForDisplay.delete(currRow - NUM_LAST_ROWS);
          }
          // Add values in row to sample column values
          (result.data as string[]).forEach((data, idx) => {
            if (
              sampleColumnValues.has(idx) &&
              sampleColumnValues.get(idx).size < MAX_COLUMN_SAMPLES
            ) {
              sampleColumnValues.get(idx).add(data);
            }
          });
        }
        currRow++;
      },
    });
  }

  function onFileOptionsSubmitted(): void {
    if (_.isEmpty(props.csvData) || !props.uploadedFile) {
      return;
    }
    if (
      props.csvData.headerRow !== headerRowInput ||
      props.csvData.firstDataRow !== firstDataRowInput ||
      props.csvData.lastDataRow !== lastDataRowInput
    ) {
      setIsUpdatingData(true);
      processFile(
        props.uploadedFile,
        headerRowInput,
        firstDataRowInput,
        lastDataRowInput
      );
    }
  }
}
