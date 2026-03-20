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

import { css, ThemeProvider } from "@emotion/react";
import React, { useEffect, useState } from "react";

import { Category } from "../components/subject_page/category";
import { displayNameForPlaceType } from "../place/util";
import { getStatsVarTitle } from "../shared/stats_var_titles";
import { NamedTypedNode } from "../shared/types";
import theme from "../theme/theme";
import { CategoryConfig } from "../types/subject_page_proto_types";
import { getDataCommonsClient } from "../utils/data_commons_client";

interface RankingPagePropType {
  // Name of the parent place the ranking page is for
  placeName: string;
  // Type of the places to be ranked. Must be a child place type of withinPlace.
  placeType: string;
  // DCID of the parent place
  withinPlace: string;
  // DCID of the stat var to be ranked
  statVar: string;
  // Whether to divide the stat var values by population
  isPerCapita: boolean;
  // Scaling factor to multiply the stat var values by
  scaling: number;
  // Unit of the stat var
  unit: string;
  // Date of the stat var
  date: string;
}

export const RankingPage = (props: RankingPagePropType): React.JSX.Element => {
  // Get the display name of the stat var, localized
  const statVarName = getStatsVarTitle(props.statVar);
  const parentPlace: NamedTypedNode = {
    name: props.placeName,
    dcid: props.withinPlace,
    types: [],
  };

  // Get the pluralized place type for the page title
  const pluralPlaceType = displayNameForPlaceType(
    props.placeType,
    true /* isPlural */
  );
  const pageTitle = `Ranking by ${statVarName} for ${pluralPlaceType} in ${props.placeName}`;

  return (
    <div>
      <ThemeProvider theme={theme}>
        <h1
          css={css`
            ${theme.typography.family.heading}
            ${theme.typography.heading.lg}
          `}
        >
          {pageTitle}
        </h1>
        <Category
          config={getCategoryConfig(props, statVarName)}
          enclosedPlaceType={props.placeType}
          eventTypeSpec={{}}
          id="ranking-page-category"
          place={parentPlace}
          svgChartHeight={500}
        />
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
  statVarSpec[props.statVar] = {
    statVar: props.statVar,
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
                statVarKey: [props.statVar],
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
