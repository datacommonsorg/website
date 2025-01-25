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
import Papa from "papaparse";
import React, { useEffect, useRef, useState } from "react";
import { Button, Card } from "reactstrap";

import { loadSpinner, removeSpinner, saveToFile } from "../../shared/util";
import {
  DATE_ALL,
  DATE_LATEST,
  DownloadDateTypes,
  DownloadOptions,
} from "./page";

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
  const csvReqPayload = useRef({});
  const prevOptions = useRef(null);

  useEffect(() => {
    if (
      (props.isDisabled && _.isEmpty(errorMessage)) ||
      _.isEqual(prevOptions.current, props.selectedOptions)
    ) {
      return;
    }
    prevOptions.current = props.selectedOptions;
    csvReqPayload.current = getCsvReqPayload();
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
            onClick={onDownloadClicked}
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

  function getCsvReqPayload(): {
    parentPlace: string;
    childType: string;
    statVars: string[];
    facetMap: Record<string, string>;
    minDate: string;
    maxDate: string;
  } {
    // When both minDate and maxDate are set as "latest", the api will get the
    // data for the latest date.
    let minDate = props.selectedOptions.minDate;
    let maxDate = props.selectedOptions.maxDate;
    if (props.selectedOptions.dateType === DownloadDateTypes.ALL) {
      minDate = DATE_ALL;
      maxDate = DATE_ALL;
    } else if (props.selectedOptions.dateType === DownloadDateTypes.LATEST) {
      minDate = DATE_LATEST;
      maxDate = DATE_LATEST;
    }
    return {
      parentPlace: props.selectedOptions.selectedPlace.dcid,
      childType: props.selectedOptions.enclosedPlaceType,
      statVars: Object.keys(props.selectedOptions.selectedStatVars),
      facetMap: props.selectedOptions.selectedFacets,
      minDate,
      maxDate,
    };
  }

  function onDownloadClicked(): void {
    if (_.isEmpty(csvReqPayload.current)) {
      return;
    }
    axios
      .post("/api/csv/within", csvReqPayload.current)
      .then((resp) => {
        if (resp.data) {
          saveToFile(
            `${props.selectedOptions.selectedPlace.name}_${props.selectedOptions.enclosedPlaceType}.csv`,
            resp.data
          );
        } else {
          alert("Sorry, there was a problem downloading the csv.");
        }
      })
      .catch(() => {
        alert("Sorry, there was a problem downloading the csv.");
      });
  }

  function fetchPreviewData(): void {
    loadSpinner(SECTION_ID);
    if (_.isEmpty(csvReqPayload.current)) {
      return;
    }
    const reqObject = _.cloneDeep(csvReqPayload.current);
    reqObject["rowLimit"] = NUM_ROWS;
    axios
      .post("/api/csv/within", reqObject)
      .then((resp) => {
        if (resp.data) {
          Papa.parse(resp.data, {
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
