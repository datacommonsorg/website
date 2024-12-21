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

import Papa from "papaparse";
import React, { useState } from "react";

import { Column, CsvData, Mapping } from "../types";
import { PlaceDetector } from "../utils/detect_place";
import { getPredictions } from "../utils/heuristics";

const NUM_FIRST_ROWS = 3;
const NUM_LAST_ROWS = 3;
const MAX_COLUMN_SAMPLES = 100;

interface UploadSectionProps {
  onCsvProcessed: (csv: CsvData) => void;
  onPredictionRetrieved: (predictedMapping: Mapping) => void;
  placeDetector: PlaceDetector;
}

export function UploadSection(props: UploadSectionProps): JSX.Element {
  const [isProcessingData, setIsProcessingData] = useState<boolean>(false);

  return (
    <div className="section-container">
      <div className="upload-section-header">
        <h2>Upload CSV</h2>
      </div>
      <div className="upload-section-inputs">
        <input
          type="file"
          accept=".csv"
          onChange={(event): void => onFileUpload(event.target.files)}
        />
      </div>
      <div id="screen" style={{ display: isProcessingData ? "block" : "none" }}>
        <div id="spinner"></div>
      </div>
    </div>
  );

  function getOrderedColumns(headerRow: string[]): Column[] {
    const uniqueHeaders = new Set();
    headerRow.forEach((header) => {
      if (uniqueHeaders.has(header)) {
        uniqueHeaders.delete(header);
      } else {
        uniqueHeaders.add(header);
      }
    });
    const orderedColumns = [];
    headerRow.forEach((header, idx) => {
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
    csvData: CsvData,
    sampleColumnValues: Map<number, Set<string>>
  ): void {
    for (const colIdx of Array.from(sampleColumnValues.keys())) {
      csvData.columnValuesSampled.set(
        colIdx,
        Array.from(sampleColumnValues.get(colIdx))
      );
    }
    const predictedMapping = getPredictions(csvData, props.placeDetector);
    props.onCsvProcessed(csvData);
    props.onPredictionRetrieved(predictedMapping);
    setIsProcessingData(false);
  }

  function onFileUpload(files: FileList): void {
    if (files.length < 1) {
      // TODO: handle malformed csv
      return;
    }
    setIsProcessingData(true);
    const csvData = {
      orderedColumns: [],
      columnValuesSampled: new Map(),
      rowsForDisplay: new Map(),
      rawCsvFile: files[0],
    };
    // key is column idx
    const sampleColumnValues: Map<number, Set<string>> = new Map();
    let currRow = 0;
    Papa.parse(files[0], {
      complete: () => {
        onParseComplete(csvData, sampleColumnValues);
      },
      error: () => {
        setIsProcessingData(false);
        alert("sorry, there was a problem processing the uploaded file");
      },
      step: (result) => {
        // if currRow === 0, process as a header row. Otherwise, process as a
        // data row.
        if (currRow === 0) {
          csvData.orderedColumns = getOrderedColumns(result.data as string[]);
          csvData.orderedColumns.forEach((_, idx) => {
            sampleColumnValues.set(idx, new Set());
          });
        } else {
          csvData.rowsForDisplay.set(BigInt(currRow), result.data);
          if (currRow > NUM_FIRST_ROWS + NUM_LAST_ROWS) {
            // remove the first row added that is not the first n rows or the
            // last n rows.
            csvData.rowsForDisplay.delete(BigInt(currRow - NUM_LAST_ROWS));
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
}
