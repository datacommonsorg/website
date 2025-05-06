/**
 * Copyright 2025 Google LLC
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
 * A component to display an individual data source associated with a place.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { intl } from "../../../i18n/i18n";
import { pageMessages } from "../../../i18n/i18n_data_overview_messages";
import { DataSourceGroup } from "../place_data";

interface DataSourceProps {
  //a data source associated with a particular place.
  placeDataSource: DataSourceGroup;
}

export const DataSource = ({
  placeDataSource,
}: DataSourceProps): ReactElement => {
  const theme = useTheme();
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: ${theme.spacing.lg}px;
        padding-bottom: ${theme.spacing.md}px;
        border-bottom: 1px solid ${theme.colors.border.primary.light};
        &:last-of-type {
          padding: 0;
          border: 0;
        }
      `}
    >
      <div>
        <h4
          css={css`
            ${theme.typography.family.text}
            ${theme.typography.text.md}
              margin-bottom: ${theme.spacing.sm}px;
          `}
        >
          {placeDataSource.label}
        </h4>
        <p
          css={css`
            ${theme.typography.family.text}
            ${theme.typography.text.md}
              margin: 0;
          `}
        >
          <a href={placeDataSource.url}>{placeDataSource.url}</a>
        </p>
        <p
          css={css`
            ${theme.typography.family.text}
            ${theme.typography.text.sm}
              margin: 0;
            display: flex;
            gap: ${theme.spacing.xs}px;
          `}
        >
          <strong>{intl.formatMessage(pageMessages.Topics)}:</strong>
          {placeDataSource.topics.map((topic, index) => (
            <span key={index}>
              {topic}
              {index < placeDataSource.topics.length - 1 && ", "}
            </span>
          ))}
        </p>
        <p
          css={css`
            ${theme.typography.family.text}
            ${theme.typography.text.sm}
            margin: 0;
            display: flex;
            gap: ${theme.spacing.xs}px;
          `}
        >
          <strong>{intl.formatMessage(pageMessages.License)}:</strong>
          <span>
            <a href={placeDataSource.licenseUrl}>{placeDataSource.license}</a>
          </span>
        </p>
      </div>
      <div>
        <h5
          css={css`
            ${theme.typography.family.text}
            ${theme.typography.text.xs}
            text-transform: uppercase;
            margin-bottom: ${theme.spacing.sm}px;
            padding: 7px 0; // Add visual alignment with the first column title
          `}
        >
          {intl.formatMessage(pageMessages.DataSets)}
        </h5>
        <ul
          css={css`
            ${theme.typography.family.text}
            ${theme.typography.text.md}
            margin: 0;
            padding-left: ${theme.spacing.md}px;
            color: ${theme.colors.link.primary.base};
          `}
        >
          {placeDataSource.dataSets &&
            placeDataSource.dataSets.map((dataSet, index) => (
              <li key={index}>
                <a href={dataSet.url}>{dataSet.label}</a>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};
