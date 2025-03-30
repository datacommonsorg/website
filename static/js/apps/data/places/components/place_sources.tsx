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

/**
 * A component to display a simple text block
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { intl, LocalizedLink } from "../../../../i18n/i18n";
import { componentPlaceSources } from "../../../../i18n/i18n_place_messages";

export const PlaceSources = (): ReactElement => {
  const theme = useTheme();
  return (
    <div
      css={css`
        ${theme.radius.tertiary}
        background: ${theme.colors.background.primary.base};
        border: 1px solid ${theme.colors.border.primary.light};
        width: 100%;
        margin-bottom: ${theme.spacing.xl}px;
        padding: ${theme.spacing.lg}px;
      `}
    >
      <header>
        <h3
          css={css`
            ${theme.typography.family.heading}
            ${theme.typography.heading.xs}
          `}
        >
          {intl.formatMessage(componentPlaceSources.DataSources)}
        </h3>
      </header>
      {/* Item Blocks */}
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${theme.spacing.lg}px;
        `}
      >
        <div className="statisticItemMeta">
          <h4
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.md}
              margin-bottom: ${theme.spacing.sm}px;
            `}
          >
            Canada Statistics
          </h4>
          <p
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.md}
              margin: 0;
            `}
          >
            <a href="#">statcan.gc.ca</a>
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
            <strong>{intl.formatMessage(componentPlaceSources.Topics)}:</strong>
            <span>Demographics</span>,<span>Economy</span>,<span>Health</span>,
            <span>Education</span>
          </p>
          <p
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.sm}
              display: flex;
              gap: ${theme.spacing.xs}px;
            `}
          >
            <strong>
              {intl.formatMessage(componentPlaceSources.License)}:
            </strong>
            <span>
              <a href="#">Creative Commons 4</a>
            </span>
          </p>
        </div>
        <div className="statisticItemSets">
          <h5
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.xs}
              text-transform: uppercase;
              margin-bottom: ${theme.spacing.sm}px;
            `}
          >
            {intl.formatMessage(componentPlaceSources.DataSets)}
          </h5>
          <ul
            css={css`
              ${theme.typography.family.text}
              ${theme.typography.text.md}
              margin: 0;
              padding-left: ${theme.spacing.lg}px;
              color: ${theme.colors.link.primary.base};
            `}
          >
            <li>
              <a href="#">Canada Statitstics</a>
            </li>
            <li>
              <a href="#">Population Estimates</a>
            </li>
          </ul>
        </div>
      </div>
      {/* Item Blocks */}
    </div>
  );
};
