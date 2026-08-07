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
import { useIntl } from "react-intl";

import { Button } from "../../components/elements/button/button";
import { Check } from "../../components/elements/icons/check";
import { Download } from "../../components/elements/icons/download";
import { ProgressActivity } from "../../components/elements/icons/progress_activity";
import { toolMessages } from "../../i18n/i18n_tool_messages";
import { WEBSITE_SURFACE_HEADER } from "../../shared/constants";
import {
  extractFlagsToPropagate,
  loadSpinner,
  removeSpinner,
  saveToFile,
} from "../../shared/util";
import { DATE_ALL, DownloadOptions } from "./context";

const NUM_ROWS = 7;
const SECTION_ID = "preview-section";
const DOWNLOADED_RESET_DELAY_MS = 1500;
// Columns hidden from the preview table (still included in the downloaded
// CSV).
// Column names below must match TIDY_CSV_HEADER_ROW in
// server/routes/shared_api/csv.py — keep both in sync when renaming.
const PREVIEW_HIDDEN_COLUMNS = new Set<string>([
  "Unit DCID",
  "Import name",
  "Observation period",
  "Scaling factor",
]);
// Column header labels overridden in the preview table (downloaded CSV keeps
// the original label).
const PREVIEW_COLUMN_LABELS: Record<string, string> = {
  "Unit display name": "Unit",
};

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
  const intl = useIntl();

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
  const allColumnsHeader = showPreview ? previewData[0] : [];
  const allColumnsDataRows = showPreview
    ? previewData
        .slice(1)
        .filter((row) => row.length === allColumnsHeader.length)
    : [];
  // Don't show columns that are empty for every row in the preview.
  const visibleColumnIndices = allColumnsHeader
    .map((_heading, idx) => idx)
    .filter((idx) => !PREVIEW_HIDDEN_COLUMNS.has(allColumnsHeader[idx]))
    .filter((idx) => allColumnsDataRows.some((row) => !_.isEmpty(row[idx])));
  const header = visibleColumnIndices.map(
    (idx) =>
      PREVIEW_COLUMN_LABELS[allColumnsHeader[idx]] || allColumnsHeader[idx]
  );
  const dataRows = allColumnsDataRows.map((row) =>
    visibleColumnIndices.map((idx) => row[idx])
  );
  // Add a row at the bottom of the table with "..." in each cell
  const emptyRow = new Array(header.length).fill("");
  const wideColumnIdx = allColumnsHeader.indexOf("Variable name");
  const wideColumnVisibleIdx = visibleColumnIndices.indexOf(wideColumnIdx);

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
        display: flex;
        flex-direction: column;
        padding: 0 ${theme.spacing.lg}px ${theme.spacing.lg}px;
        margin: 0;
        gap: ${theme.spacing.lg}px;
      `}
    >
      {errorMessage && <div>{errorMessage}</div>}
      {showPreview && (
        <>
          <div
            css={css`
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: ${theme.spacing.xl}px;
              @media (max-width: ${theme.breakpoints.md}px) {
                gap: ${theme.spacing.md}px;
                flex-direction: column;
              }
            `}
          >
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${theme.spacing.md}px;
                flex-shrink: 2;
              `}
            >
              {Object.keys(props.selectedOptions.selectedStatVars).map((sv) => (
                <h3
                  key={sv}
                  id={sv}
                  css={css`
                    margin-bottom: 0;
                  `}
                >
                  {props.selectedOptions.selectedStatVars[sv]?.title || sv}
                </h3>
              ))}
              <p
                css={css`
                  margin: 0;
                `}
              >
                {intl.formatMessage(toolMessages.downloadToolPreviewDisclaimer)}
              </p>
            </div>
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
              css={css`
                flex-shrink: 0;
              `}
            >
              {intl.formatMessage(toolMessages.downloadCsvButton)}
            </Button>
          </div>
          <table
            css={css`
              && {
                max-width: 100%;
                overflow-x: scroll;
                display: block;
                font-size: 0.9rem;
                border: 1px solid #ccc;
                border-collapse: collapse;
                th,
                td {
                  border: 1px solid #ccc;
                }
                th {
                  background: #f5f6fa;
                  border-top: none;
                  font-size: 0.8rem;
                  line-height: 1rem;
                  white-space: nowrap;
                  padding: 0.5rem;
                }
                td {
                  text-align: left;
                  padding: 0.2rem 0.5rem;
                }
                tr:last-child td {
                  border-bottom: none;
                }
                tr td:first-child,
                tr th:first-child {
                  border-left: none;
                }
                tr td:last-child,
                tr th:last-child {
                  border-right: none;
                  width: 100%;
                }
              }
            `}
          >
            <thead>
              <tr>
                {header.map((heading, idx) => {
                  return (
                    <th
                      key={"heading" + idx}
                      css={
                        idx === wideColumnVisibleIdx &&
                        css`
                          min-width: 180px;
                        `
                      }
                    >
                      {heading}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rowIdx) => {
                return (
                  <tr key={"row" + rowIdx}>
                    {row.map((cell, cellIdx) => {
                      return (
                        <td
                          key={`row${rowIdx}cell${cellIdx}`}
                          css={
                            cellIdx === wideColumnVisibleIdx &&
                            css`
                              min-width: 180px;
                            `
                          }
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr>
                {emptyRow.map((_, idx) => {
                  return (
                    <td
                      key={"empty" + idx}
                      css={
                        idx === wideColumnVisibleIdx &&
                        css`
                          min-width: 180px;
                        `
                      }
                    >
                      ...
                    </td>
                  );
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
              {intl.formatMessage(toolMessages.downloadCsvButton)}
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
    const url =
      flags.size > 0
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
          alert(intl.formatMessage(toolMessages.downloadToolCsvDownloadError));
        }
      })
      .catch(() => {
        alert(intl.formatMessage(toolMessages.downloadToolCsvDownloadError));
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
    const url =
      flags.size > 0
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
        setErrorMessage(
          intl.formatMessage(toolMessages.downloadToolPreviewFetchError)
        );
      });
  }
}
