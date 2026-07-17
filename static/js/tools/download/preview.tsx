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

import { css, useTheme } from "@emotion/react";
import axios from "axios";
import _ from "lodash";
import Papa from "papaparse";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "../../components/elements/button/button";
import { Check } from "../../components/elements/icons/check";
import { Download } from "../../components/elements/icons/download";
import { ProgressActivity } from "../../components/elements/icons/progress_activity";
import { WEBSITE_SURFACE_HEADER } from "../../shared/constants";
import {
  downloadFile,
  extractFlagsToPropagate,
  loadSpinner,
  removeSpinner,
  saveToFile,
} from "../../shared/util";
import { DATE_ALL, DownloadOptions } from "./context";

const NUM_ROWS = 7;
const SECTION_ID = "preview-section";
const NUM_COL_PER_SV = 3;
const NUM_DEFAULT_COL = 2;
const DOWNLOADED_RESET_DELAY_MS = 1500;

const iconWrapper = css`
  position: relative;
  display: inline-block;
  width: 1em;
  height: 1em;
  & > svg {
    position: absolute;
    inset: 0;
    transition: opacity 150ms ease, transform 150ms ease;
  }
  & .hidden {
    opacity: 0;
    transform: scale(0);
  }
`;

interface PreviewProps {
  selectedOptions: DownloadOptions;
  isDisabled: boolean;
}

export function Preview(props: PreviewProps): JSX.Element {
  const [previewData, setPreviewData] = useState<string[][]>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const csvReqPayload = useRef({});
  const prevOptions = useRef(null);
  const theme = useTheme();

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

  useEffect(() => {
    if (!downloaded) return;
    const id = setTimeout(
      () => setDownloaded(false),
      DOWNLOADED_RESET_DELAY_MS
    );
    return (): void => clearTimeout(id);
  }, [downloaded]);

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
    <div
      id={SECTION_ID}
      className={cardClassName}
      css={css`
        max-width: 100%;
        overflow-scroll;
        display: flex;
        flex-direction: column;
        padding: 0;
        margin: 0;
        gap: ${theme.spacing.md}px;
      `}
    >
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
          <div
            css={css`
              display: flex;
              justify-content: flex-end;
            `}
          >
            <Button
              className="download-button"
              disabled={props.isDisabled || downloading}
              onClick={onDownloadClicked}
              startIcon={
                downloading ? (
                  <ProgressActivity />
                ) : (
                  <span css={iconWrapper}>
                    <Download className={downloaded ? "hidden" : undefined} />
                    <Check className={!downloaded ? "hidden" : undefined} />
                  </span>
                )
              }
            >
              Download CSV
            </Button>
          </div>
        </>
      )}
      <div className="screen">
        <div id="spinner"></div>
      </div>
    </div>
  );

  function getCsvReqPayload(): {
    parentPlace: string;
    childType: string;
    statVars: string[];
    facetMap: Record<string, string>;
    minDate: string;
    maxDate: string;
  } {
    return {
      parentPlace: props.selectedOptions.selectedPlace.dcid,
      childType: props.selectedOptions.enclosedPlaceType,
      statVars: Object.keys(props.selectedOptions.selectedStatVars),
      facetMap: props.selectedOptions.selectedFacets,
      minDate: DATE_ALL, // By default sets to all available dates
      maxDate: DATE_ALL,
    };
  }

  function onDownloadClicked(): void {
    if (_.isEmpty(csvReqPayload.current)) {
      return;
    }
    const headers = {
      headers: WEBSITE_SURFACE_HEADER,
    };
    setDownloading(true);
    const flags = extractFlagsToPropagate(window.location.href);
    const url = flags.size > 0
      ? `/api/csv/within?${flags.toString()}`
      : "/api/csv/within";
    axios
      .post(url, csvReqPayload.current, headers)
      .then((resp) => {
        if (resp.data) {
          const statVarDcids = Object.keys(
            props.selectedOptions.selectedStatVars
          ).join("_");
          saveToFile(
            `${props.selectedOptions.selectedPlace.name}_${props.selectedOptions.enclosedPlaceType}_${statVarDcids}.csv`,
            resp.data
          );
          setDownloaded(true);
        } else {
          alert("Sorry, there was a problem downloading the csv.");
        }
      })
      .catch(() => {
        alert("Sorry, there was a problem downloading the csv.");
      })
      .finally(() => {
        setDownloading(false);
      });
  }

  function fetchPreviewData(): void {
    loadSpinner(SECTION_ID);
    if (_.isEmpty(csvReqPayload.current)) {
      return;
    }
    const reqObject = _.cloneDeep(csvReqPayload.current);
    reqObject["rowLimit"] = NUM_ROWS;
    const headers = {
      headers: WEBSITE_SURFACE_HEADER,
    };
    const flags = extractFlagsToPropagate(window.location.href);
    const url = flags.size > 0
      ? `/api/csv/within?${flags.toString()}`
      : "/api/csv/within";
    axios
      .post(url, reqObject, headers)
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
