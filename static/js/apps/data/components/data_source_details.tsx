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
 * A component to display the content of a particular data source topic (such
 * as Health) within a panel. This panel is displayed inside a tab on the data
 * source pages.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";
import ReactMarkdown from "react-markdown";

import { DataSourceTopic } from "./data_sources";

interface DataSourceDetailsProps {
  //the data topic to be rendered in this details panel, such as the Health data source set
  dataSourceTopic: DataSourceTopic;
}

export const DataSourceDetails = ({
  dataSourceTopic,
}: DataSourceDetailsProps): ReactElement => {
  console.log(dataSourceTopic);
  const theme = useTheme();
  return (
    <div>
      <h3
        css={css`
          ${theme.typography.family.heading};
          ${theme.typography.heading.sm};
          margin-bottom: ${theme.spacing.xl}px;
        `}
      >
        {dataSourceTopic.title}
      </h3>
      {dataSourceTopic.dataSourceGroups.map((dataSourceGroup) => (
        <div
          key={dataSourceGroup.label}
          css={css`
            padding: ${theme.spacing.sm}px 0;
            display: grid;
            gap: ${theme.spacing.huge}px;
            grid-template-columns: 1fr 2fr;

            @media (max-width: ${theme.breakpoints.md}px) {
              grid-template-columns: 1fr;
              gap: ${theme.spacing.sm}px;
              border-top: 1px solid ${theme.colors.border.primary.light};
              padding-top: ${theme.spacing.lg}px;
              margin-top: ${theme.spacing.lg}px;
            }
          `}
        >
          <div
            css={css`
              ${theme.typography.family.text};
              ${theme.typography.text.md};
            `}
          >
            {dataSourceGroup.label}
            {dataSourceGroup.dataSources.map((dataSourceGroup) => (
              <div key={dataSourceGroup.label}>
                {dataSourceGroup.label}
                {dataSourceGroup.description && (
                  <ReactMarkdown>{dataSourceGroup.description}</ReactMarkdown>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div
        css={css`
          padding: ${theme.spacing.sm}px 0;
          display: grid;
          gap: ${theme.spacing.huge}px;
          grid-template-columns: 1fr 2fr;

          @media (max-width: ${theme.breakpoints.md}px) {
            grid-template-columns: 1fr;
            gap: ${theme.spacing.sm}px;
            border-top: 1px solid ${theme.colors.border.primary.light};
            padding-top: ${theme.spacing.lg}px;
            margin-top: ${theme.spacing.lg}px;
          }
        `}
      >
        <p
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          `}
        >
          Open Data for Africa
        </p>
        <ul
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          `}
        >
          <li>Kenya Census</li>
          <li>Nigeria Statistics</li>
          <li>SouthAfrica Census</li>
          <li>Uganda Bureau of Statistics (UBOS)</li>
        </ul>
      </div>
      <div
        css={css`
          padding: ${theme.spacing.sm}px 0;
          display: grid;
          gap: ${theme.spacing.huge}px;
          grid-template-columns: 1fr 2fr;

          @media (max-width: ${theme.breakpoints.md}px) {
            grid-template-columns: 1fr;
            gap: ${theme.spacing.sm}px;
            border-top: 1px solid ${theme.colors.border.primary.light};
            padding-top: ${theme.spacing.lg}px;
            margin-top: ${theme.spacing.lg}px;
          }
        `}
      >
        <p
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          `}
        >
          U.S. Department of Housing and Urban Development (HUD)
        </p>
        <ul
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          `}
        >
          <li>Income Limits</li>
        </ul>
      </div>
      <div
        css={css`
          padding: ${theme.spacing.sm}px 0;
          display: grid;
          gap: ${theme.spacing.huge}px;
          grid-template-columns: 1fr 2fr;

          @media (max-width: ${theme.breakpoints.md}px) {
            grid-template-columns: 1fr;
            gap: ${theme.spacing.sm}px;
            border-top: 1px solid ${theme.colors.border.primary.light};
            padding-top: ${theme.spacing.lg}px;
            margin-top: ${theme.spacing.lg}px;
          }
        `}
      >
        <p
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          `}
        >
          U.S. Center for Disease Control and Prevention (CDC)
        </p>
        <ul
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.md};
          `}
        >
          <li>BRFSS-NCHS Asthma Prevalence</li>
          <li>National Notifiable Diseases Surveillance System (NNDSS)</li>
          <li>Wonder: Compressed Mortality</li>
          <li>Wonder: Mortality, Underlying Cause Of Death</li>
          <li>Wonder: Natality</li>
        </ul>
      </div>
    </div>
  );
};
