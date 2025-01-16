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
  const theme = useTheme();
  return (
    <div>
      <h3
        css={css`
          ${theme.typography.family.heading};
          ${theme.typography.heading.sm};
          margin-bottom: ${theme.spacing.xl}px;
          margin-left: ${theme.spacing.md}px;
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
            transition: background ease-in-out 0.3s;
            padding: ${theme.spacing.md}px;
            &:nth-of-type(odd) {
              background: ${theme.colors.background.secondary.base};
            }

            @media (max-width: ${theme.breakpoints.md}px) {
              grid-template-columns: 1fr;
              gap: ${theme.spacing.sm}px;
            }
          `}
        >
          <div>
            <h3
              css={css`
                ${theme.typography.family.text};
                ${theme.typography.text.md};
                @media (max-width: ${theme.breakpoints.md}px) {
                  ${theme.typography.text.lg};
                  font-weight: 900;
                }
              `}
            >
              {dataSourceGroup.url ? (
                <a href={dataSourceGroup.url}>{dataSourceGroup.label}</a>
              ) : (
                dataSourceGroup.label
              )}
            </h3>
          </div>

          <div>
            {dataSourceGroup.dataSources.map((dataSourceGroup) => (
              <div
                key={dataSourceGroup.label}
                css={css`
                  ${theme.typography.family.text};
                  ${theme.typography.text.md};
                  margin-bottom: ${theme.spacing.md}px;
                  &:first-of-type,
                  &:last-of-type {
                    margin-bottom: 0;
                  }
                  p {
                    color: ${theme.colors.text.secondary.base};
                  }
                  p,
                  li {
                    word-break: break-word;
                  }
                  ul,
                  ol {
                    padding-left: ${theme.spacing.sm}px;
                    margin-left: ${theme.spacing.md}px;
                    li {
                      margin-bottom: ${theme.spacing.md}px;
                    }
                  }
                  @media (max-width: ${theme.breakpoints.md}px) {
                    margin-left: ${theme.spacing.md}px;
                  }
                `}
              >
                <h4
                  css={css`
                    ${theme.typography.family.text};
                    ${theme.typography.text.md};
                    margin-bottom: ${theme.spacing.xs}px;
                  `}
                >
                  {dataSourceGroup.url ? (
                    <a href={dataSourceGroup.url}>{dataSourceGroup.label}</a>
                  ) : (
                    dataSourceGroup.label
                  )}
                </h4>
                {dataSourceGroup.description && (
                  <ReactMarkdown>{dataSourceGroup.description}</ReactMarkdown>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
