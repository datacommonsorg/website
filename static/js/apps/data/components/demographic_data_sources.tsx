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
 * A component to display the content of the "Demographic" tab within the "Data Sources" section
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

export const DemographicDataSources = (): ReactElement => {
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
        Content for Item One
      </h3>
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
