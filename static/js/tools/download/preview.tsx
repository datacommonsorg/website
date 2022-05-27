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
 * Component for rendering the preview of the csv to be download
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { usePapaParse } from "react-papaparse";
import { Button, Card } from "reactstrap";

import { loadSpinner, removeSpinner } from "../../shared/util";
import { DownloadOptions } from "./page";

const DATE_LATEST = "latest";
const NUM_ROWS = 7;
const SECTION_ID = "preview-section";
const NUM_COL_PER_SV = 3;
const NUM_DEFAULT_COL = 2;

interface PreviewProps {
  selectedOptions: DownloadOptions;
  isDisabled: boolean;
}

export function Preview(props: PreviewProps): JSX.Element {
  const [previewData, setPreviewData] = useState<string[][]>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const csvParser = usePapaParse();
  const csvUrl = useRef("");

  useEffect(() => {
    if (props.isDisabled && _.isEmpty(errorMessage)) {
      return;
    }
    csvUrl.current = getCsvUrl();
    fetchPreviewData();
  }, [props, errorMessage]);

  // We only want to show preview once preview data has been fetched.
  const showPreview = _.isEmpty(errorMessage) && !_.isEmpty(previewData);
  // 1st row of previewData will be the header and the rest are the data rows.
  const header = showPreview ? previewData[0] : [];
  const dataRows = showPreview
    ? previewData.slice(1).filter((row) => row.length > NUM_DEFAULT_COL)
    : [];
  const numCols =
    NUM_DEFAULT_COL +
    Object.keys(props.selectedOptions.selectedStatVars).length * NUM_COL_PER_SV;
  // Add a row at the bottom of the table with "..." in each cell
  const emptyRow = new Array(numCols).fill("");

  let cardClassName = "preview-container";
  if (!_.isEmpty(errorMessage)) {
    cardClassName += " preview-error";
  } else if (props.isDisabled) {
    cardClassName += " preview-disabled";
  }
  return (
    <Card id={SECTION_ID} className={cardClassName}>
      {errorMessage && <div>{errorMessage}</div>}
      {showPreview && (
        <>
          <table>
            <thead>
              <tr>
                {header.map((heading, idx) => {
                  return <th key={"heading" + idx}>{heading}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIdx) => {
                return (
                  <tr key={"row" + rowIdx}>
                    {row.map((cell, cellIdx) => {
                      return <td key={`row${rowIdx}cell${cellIdx}`}>{cell}</td>;
                    })}
                  </tr>
                );
              })}
              <tr>
                {emptyRow.map((_, idx) => {
                  return <td key={"empty" + idx}>...</td>;
                })}
              </tr>
            </tbody>
          </table>
          <Button
            className="download-button"
            color={"primary"}
            disabled={props.isDisabled}
            onClick={() => window.open(csvUrl.current)}
          >
            Download
          </Button>
        </>
      )}
      <div className="screen">
        <div id="spinner"></div>
      </div>
    </Card>
  );

  function getCsvUrl(): string {
    const svParam = Object.keys(props.selectedOptions.selectedStatVars).join(
      "&statVars="
    );
    // When both minDate and maxDate are set as "latest", the api will get the
    // data for the latest date.
    const minDate = props.selectedOptions.dateRange
      ? props.selectedOptions.minDate
      : DATE_LATEST;
    const minDateParam = _.isEmpty(minDate) ? "" : `&minDate=${minDate}`;
    const maxDate = props.selectedOptions.dateRange
      ? props.selectedOptions.maxDate
      : DATE_LATEST;
    const maxDateParam = _.isEmpty(maxDate) ? "" : `&maxDate=${maxDate}`;
    const url =
      "/api/stats/csv/within-place" +
      `?parentPlace=${props.selectedOptions.selectedPlace.dcid}` +
      `&childType=${props.selectedOptions.enclosedPlaceType}` +
      `&statVars=${svParam}` +
      minDateParam +
      maxDateParam;
    return url;
  }

  function fetchPreviewData(): void {
    loadSpinner(SECTION_ID);
    axios
      .get(csvUrl.current + `&rowLimit=${NUM_ROWS}`)
      .then((resp) => {
        if (resp.data) {
          csvParser.readString(resp.data, {
            complete: (results) => {
              removeSpinner(SECTION_ID);
              setPreviewData(results.data as string[][]);
              setErrorMessage("");
            },
            worker: true,
          });
        }
      })
      .catch(() => {
        removeSpinner(SECTION_ID);
        setPreviewData([]);
        setErrorMessage("Sorry, there was a problem retrieving data.");
      });
  }
}
