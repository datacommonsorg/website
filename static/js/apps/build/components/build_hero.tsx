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
 * A component to display the build page hero.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { HeroColumns } from "../../../components/content/hero_columns";

export const BuildHero = (): ReactElement => {
  const theme = useTheme();
  return (
    <HeroColumns variant="right">
      <HeroColumns.Left>
        <h2
          css={css`
            ${theme.typography.family.heading};
            ${theme.typography.heading.lg};
            color: ${theme.colors.text.primary.light};
          `}
        >
          Build your Data Commons, overlay your data with global data, and let
          everyone in your organization uncover insights with natural language
          questions.{" "}
          <a
            href="https://docs.datacommons.org/custom_dc?utm_source=buildpage_hero"
            title="Build your own Data Commons"
            css={css`
              ${theme.typography.family.heading};
              ${theme.typography.heading.lg};
              color: ${theme.colors.link.primary.light};
            `}
          >
            Learn how
          </a>
        </h2>
      </HeroColumns.Left>
      <HeroColumns.Right>
        <div
          css={css`
            & > h4 {
              ${theme.typography.family.text};
              ${theme.typography.text.md};
              color: ${theme.colors.text.primary.light};
              font-weight: 900;
            }
            & > p {
              ${theme.typography.family.text};
              ${theme.typography.text.md};
              color: ${theme.colors.text.primary.light};
              margin-bottom: ${theme.spacing.xxl}px;
              @media (max-width: ${theme.breakpoints.sm}px) {
                margin-bottom: ${theme.spacing.lg}px;
              }
              &:last-of-type {
                margin-bottom: 0;
              }
            }
          `}
        >
          <h4>Build and deploy your own</h4>
          <p>
            Launch your own Data Commons and customize it with your own data to
            better engage your specific audience
          </p>
          <h4>Explore data with natural language</h4>
          <p>
            Ask questions in your own words and get answers directly from your
            data
          </p>
          <h4>Gain actionable insights</h4>
          <p>
            Find actionable insights from your data in connection to global data{" "}
          </p>
        </div>
      </HeroColumns.Right>
    </HeroColumns>
  );
};
