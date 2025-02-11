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
/** @jsxImportSource @emotion/react */

import { PlaceOverviewTableApiResponse } from "@datacommonsorg/client/dist/data_commons_web_client_types";
import { css, useTheme } from "@emotion/react";
import React, { useRef } from "react";

import { LocationCity } from "../components/elements/icons/location_city";
import { GoogleMap } from "../components/google_map";
import { formatDate, formatNumber, intl } from "../i18n/i18n";
import { pageMessages } from "../i18n/i18n_place_messages";
import { InfoTooltipComponent } from "../shared/components";
import { NamedTypedPlace } from "../shared/types";
import { isPlaceContainedInUsa } from "./util";

/**
 * Component that displays a table of key demographic statistics for a place.
 *
 * Fetches data for population, median income, median age, unemployment rate,
 * and crime statistics using the Data Commons API. Displays the values in a
 * formatted table with units and dates.
 *
 * @param props.placeDcid The DCID of the place to show statistics for
 * @returns A table component showing key demographic statistics, or null if data not loaded
 */
const PlaceOverviewTable = (props: {
  placeDcid: string;
  placeOverviewTableApiResponse: PlaceOverviewTableApiResponse;
}): React.JSX.Element => {
  const theme = useTheme();
  const containerRef = useRef(null);
  const dataRows = props.placeOverviewTableApiResponse.data;

  const sourceUrls = new Set(
    dataRows.map((dataRow) => {
      return dataRow.provenanceUrl;
    })
  );
  const statVarDcids = dataRows.map((row) => {
    return row.variableDcid;
  });

  return (
    <div>
      <table
        ref={containerRef}
        className="key-demographics-table"
        css={css`
          width: 100%;
          margin-bottom: 1rem;
          color: #212529;
          th {
            ${theme.typography.text.md}
            font-weight: 500;
            border-bottom: 1px solid var(--gm-3-ref-neutral-neutral-70, #ababab);
            border-top: none;
            vertical-align: bottom;
            padding: 0 0 ${theme.spacing.md}px 0;
          }
          td {
            ${theme.typography.text.sm}
            padding: 12px 0;
            vertical-align: top;
            border-bottom: 1px solid #e1e3e1;
            &:first-of-type {
              font-weight: 500;
            }
          }
        `}
      >
        <thead>
          <tr>
            <th scope="col" colSpan={2}>
              {intl.formatMessage(pageMessages.KeyDemographics)}
            </th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {dataRows.map((dataRow, index) => {
            const unit = dataRow.unit;
            const value = dataRow.value;

            // Format the observation value with the unit
            const formattedObservationValue = formatNumber(
              value,
              unit,
              undefined,
              undefined,
              {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0,
                style: "decimal",
              }
            );
            const formattedDate = formatDate(dataRow.date);
            return (
              <tr key={index} className="key-demographics-row">
                <td>{dataRow.name}</td>
                <td>
                  {formattedObservationValue} ({formattedDate})
                </td>
                <td></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div
        css={css`
          ${theme.typography.text.xs}
          a {
            color: ${theme.colors.text.primary.base};
          }
        `}
      >
        {Array.from(sourceUrls).map((sourceUrl, index) => (
          <React.Fragment key={sourceUrl}>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              {new URL(sourceUrl).hostname}
            </a>
            {index < sourceUrls.size - 1 ? ", " : ""}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/**
 * Displays an overview of a place including its name, summary, map and key statistics.
 *
 * @param props.place The place object containing name and dcid
 * @param props.placeSummary A text summary describing the place
 * @returns A component with the place overview including icon, name, summary, map and statistics table
 */
export const PlaceOverview = (props: {
  place: NamedTypedPlace;
  placeSummary?: string;
  parentPlaces: NamedTypedPlace[];
  placeOverviewTableApiResponse: PlaceOverviewTableApiResponse;
}): React.JSX.Element => {
  const { place, placeSummary, parentPlaces, placeOverviewTableApiResponse } =
    props;
  const isInUsa = isPlaceContainedInUsa(
    parentPlaces.map((place) => place.dcid)
  );
  const theme = useTheme();
  return (
    <div
      css={css`
        border-radius: 8px;
        border: 1px solid var(--GM3-ref-neutral-neutral90, #e3e3e3);
        background: rgba(211, 227, 253, 0.1);
        padding: 24px;
        margin-bottom: ${theme.spacing.md}px;
      `}
    >
      <div
        css={css`
          ${theme.typography.text.md}
          align-items: center;
          display: flex;
          font-weight: 500;
          gap: ${theme.spacing.sm}px;
          margin-bottom: ${theme.spacing.md}px;
          & > svg {
            height: 1.5rem;
          }
        `}
      >
        <LocationCity />
        <span>{intl.formatMessage(pageMessages.SummaryOverview)}</span>
        <InfoTooltipComponent
          iconPath="../../images/info_spark.svg"
          description={intl.formatMessage(
            pageMessages.SummaryOverviewTooltip
          )}
        />
      </div>
      {placeSummary && (
        <div
          className="place-summary"
          css={css`
            ${theme.typography.text.sm}
            margin-bottom: ${theme.spacing.md}px;
          `}
        >
          <span>{placeSummary}</span>
        </div>
      )}

      <div
        css={css`
          display: grid;
          grid-template-columns: 248px 4fr;
          gap: ${theme.spacing.xl}px;
          &:has(> :only-child) {
            grid-template-columns: 1fr;
          }
          @media (max-width: ${theme.breakpoints.md}px) {
            grid-template-columns: 1fr;
          }
        `}
      >
        {isInUsa && (
          <div>
            <GoogleMap dcid={place.dcid}></GoogleMap>
          </div>
        )}
        <div>
          {!isInUsa && <br></br>}
          <PlaceOverviewTable
            placeDcid={place.dcid}
            placeOverviewTableApiResponse={placeOverviewTableApiResponse}
          />
        </div>
      </div>
    </div>
  );
};
