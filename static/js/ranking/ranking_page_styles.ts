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

import theme from "../theme/theme";

export const RankingPageContainer = styled.div`
  .ranking-header-container {
    padding: 0 24px;

    h1 {
      ${theme.typography.family.heading}
      ${theme.typography.heading.lg}
    }

    .ancestor-places-links {
      ${theme.typography.family.heading}
      ${theme.typography.heading.xs}
      font-weight: 500;
      margin-bottom: 32px;
    }
  }

  #ranking-page-category {
    padding: 0;

    .block {
      padding: 0;

      .block-controls {
        padding: 0 24px;
      }
    }
  }

  .chart-container.ranking-tile {
    margin-top: 0;

    @media (min-width: ${theme.breakpoints.md}px) {
      width: fit-content;
    }

    .ranking-list {
      padding: 0 24px;

      table {
        td.stat {
          width: fit-content;
        }
        td.ranking-date-cell {
          width: fit-content;
        }
      }
      @media (min-width: ${theme.breakpoints.md}px) {
        table {
          width: fit-content;

          td.rank {
            padding-right: 32px;
          }

          td.place-name {
            padding-right: 180px;
          }
        }
      }
    }

    .chart-footnote {
      padding: 0 24px;
    }

    .chart-container-footer {
      padding: 16px 24px;
    }
  }

  .ranking-header-section h4 {
    display: none; // Hide tile title, use page title instead
  }
`;
