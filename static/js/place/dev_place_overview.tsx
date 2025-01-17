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

import { DataRow } from "@datacommonsorg/client";
import { css, useTheme } from "@emotion/react";
import React, { useEffect, useRef, useState } from "react";

import { LocationCity } from "../components/elements/icons/location_city";
import { GoogleMap } from "../components/google_map";
import { intl } from "../i18n/i18n";
import { NamedTypedPlace, StatVarSpec } from "../shared/types";
import { defaultDataCommonsClient } from "../utils/data_commons_client";
import { isPlaceContainedInUsa, pageMessages } from "./util";

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
}): React.JSX.Element => {
  const theme = useTheme();
  const { placeDcid } = props;
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const containerRef = useRef(null);
  // Fetch key demographic statistics for the place when it changes
  useEffect(() => {
    (async (): Promise<void> => {
      const placeOverviewDataRows = await defaultDataCommonsClient.getDataRows({
        entities: [placeDcid],
        variables: [
          "Count_Person",
          "Median_Income_Person",
          "Median_Age_Person",
          "UnemploymentRate_Person",
        ],
      });
      setDataRows(placeOverviewDataRows);
    })();
  }, [placeDcid]);
  if (!dataRows) {
    return null;
  }
  const sourceUrls = new Set(
    dataRows.map((dataRow) => {
      return dataRow.variable.observation.metadata.provenanceUrl;
    })
  );
  const statVarDcids = dataRows.map((dr) => {
    return dr.variable.dcid;
  });

  const statVarSpecs: StatVarSpec[] = statVarDcids.map((dcid) => {
    return {
      statVar: dcid,
      denom: "", // Initialize with an empty string or a default denominator if applicable
      unit: "", // Initialize with an empty string or a default unit if applicable
      scaling: 1, // Initialize with a default scaling factor
      log: false, // Initialize with a default log value
    };
  });

  return (
    <div>
      <table
        ref={containerRef}
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
              Key Demographics
            </th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {dataRows.map((dataRow, index) => {
            const unit = dataRow.variable.observation.metadata.unitDisplayName
              ? dataRow.variable.observation.metadata.unitDisplayName
              : "";
            const formattedObservationValue =
              dataRow.variable.observation.value.toLocaleString();
            return (
              <tr key={index}>
                <td>{dataRow.variable.properties.name}</td>
                <td>
                  {formattedObservationValue} {unit} (
                  {dataRow.variable.observation.date})
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
  placeSummary: string;
  parentPlaces: NamedTypedPlace[];
}): React.JSX.Element => {
  const { place, placeSummary, parentPlaces } = props;
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
      </div>
      <div
        css={css`
          ${theme.typography.text.sm}
          margin-bottom: ${theme.spacing.md}px;
        `}
      >
        {placeSummary}
      </div>
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
          <PlaceOverviewTable placeDcid={place.dcid} />
        </div>
      </div>
    </div>
  );
};
