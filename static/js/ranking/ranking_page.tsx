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

/**
 * Main component for rendering a ranking page.
 */

import { ThemeProvider } from "@emotion/react";
import styled from "@emotion/styled";
import React from "react";

import { Category } from "../components/subject_page/category";
import { getStatsVarTitle } from "../shared/stats_var_titles";
import { NamedTypedNode } from "../shared/types";
import theme from "../theme/theme";
import { CategoryConfig } from "../types/subject_page_proto_types";
import { RankingPageHeader } from "./ranking_header";

interface RankingPagePropType {
  // Name of the parent place the ranking page is for, already localized
  parentPlaceNameLocalized: string;
  // Type of the places to be ranked. Must be a child place type of withinPlace.
  childPlaceType: string;
  // DCID of the parent place
  parentPlaceDcid: string;
  // DCID of the stat var to be ranked
  statVarDcid: string;
  // Whether to divide the stat var values by population
  isPerCapita: boolean;
  // Scaling factor to multiply the stat var values by
  scaling: number;
  // Unit of the stat var
  unit: string;
  // Date of the stat var
  date: string;
  // Locale of the page
  locale: string;
}

export const RankingPage = (props: RankingPagePropType): React.JSX.Element => {
  // Get the display name of the stat var, localized
  const statVarNameLocalized = getStatsVarTitle(props.statVarDcid);

  // The parent place as a NamedTypedNode, used for the Category component
  const parentPlaceLocalized: NamedTypedNode = {
    name: props.parentPlaceNameLocalized,
    dcid: props.parentPlaceDcid,
    types: [], // Unused for ranking tile
  };

  return (
    <div>
      <ThemeProvider theme={theme}>
        <RankingPageContainer>
          <RankingPageHeader
            parentPlaceNameLocalized={props.parentPlaceNameLocalized}
            parentPlaceDcid={props.parentPlaceDcid}
            childPlaceType={props.childPlaceType}
            statVarNameLocalized={statVarNameLocalized}
            locale={props.locale}
          />
          <Category
            config={getCategoryConfig(props, statVarNameLocalized)}
            enclosedPlaceType={props.childPlaceType}
            eventTypeSpec={{}}
            id="ranking-page-category"
            place={parentPlaceLocalized}
            svgChartHeight={500}
          />
        </RankingPageContainer>
      </ThemeProvider>
    </div>
  );
};

/**
 * Build category config for the ranking page.
 */
function getCategoryConfig(
  props: RankingPagePropType,
  statVarName: string
): CategoryConfig {
  // Build statVarSpec
  const statVarSpec = {};
  statVarSpec[props.statVarDcid] = {
    statVar: props.statVarDcid,
    denom: props.isPerCapita ? "Count_Person" : "",
    unit: props.unit,
    scaling: props.scaling,
    log: false,
    name: statVarName,
    date: props.date,
  };

  return {
    title: "",
    statVarSpec,
    blocks: [
      {
        title: "",
        description: "",
        columns: [
          {
            tiles: [
              {
                type: "RANKING",
                title: "",
                description: "",
                statVarKey: [props.statVarDcid],
                rankingTileSpec: {
                  showHighest: true,
                  showLowest: false,
                  rankingCount: 100, // Start with first 100 entries
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

const RankingPageContainer = styled.div`
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

    .ranking-list {
      padding: 0 24px;
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
