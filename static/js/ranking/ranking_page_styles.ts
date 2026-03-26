/**
 * Copyright 2026 Google LLC
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

import styled from "@emotion/styled";

import { FontFamily, TextVariant, Theme } from "../theme/types";

/** Styles for the ranking pages
 *
 * We use a separate styled div instead of SCSS file, both to avoid polluting global
 * styles and to enable theme-aware styling.
 */
export const RankingPageContainer = styled.div`
  .ranking-header-container {
    padding: 0 ${(props: { theme: Theme }): number => props.theme.spacing.lg}px;

    h1 {
      ${(props: { theme: Theme }): FontFamily =>
        props.theme.typography.family.heading}
      ${(props: { theme: Theme }): TextVariant =>
        props.theme.typography.heading.lg}
    }

    .ancestor-places-links {
      ${(props: { theme: Theme }): FontFamily =>
        props.theme.typography.family.heading}
      ${(props: { theme: Theme }): TextVariant =>
        props.theme.typography.heading.xs}
      font-weight: 500;
      margin-bottom: ${(props: { theme: Theme }): number =>
        props.theme.spacing.xl}px;
    }
  }

  #ranking-page-category {
    padding: 0;

    .block {
      padding: 0;

      .block-controls {
        padding: 0
          ${(props: { theme: Theme }): number => props.theme.spacing.lg}px;
      }
    }
  }

  .chart-container.ranking-tile {
    margin-top: 0;

    @media (min-width: ${(props: { theme: Theme }): number =>
        props.theme.breakpoints.md}px) {
      width: fit-content;
    }

    .ranking-list {
      padding: 0
        ${(props: { theme: Theme }): number => props.theme.spacing.lg}px;

      table {
        td.stat {
          width: fit-content;
        }
        td.ranking-date-cell {
          width: fit-content;
        }
      }
      @media (min-width: ${(props: { theme: Theme }): number =>
          props.theme.breakpoints.md}px) {
        table {
          width: fit-content;

          td.rank {
            padding-right: ${(props: { theme: Theme }): number =>
              props.theme.spacing.xl}px;
          }

          td.place-name {
            padding-right: 180px;
          }
        }
      }
    }

    .chart-footnote {
      padding: 0
        ${(props: { theme: Theme }): number => props.theme.spacing.lg}px;
    }

    .chart-container-footer {
      padding: ${(props: { theme: Theme }): number => props.theme.spacing.md}px
        ${(props: { theme: Theme }): number => props.theme.spacing.lg}px;
    }
  }

  .ranking-header-section h4 {
    display: none; // Hide tile title, use page title instead
  }
`;
