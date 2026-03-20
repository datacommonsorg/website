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
import { LocalizedLink } from "../i18n/i18n";
import { displayNameForPlaceType } from "../place/util";
import { getStatsVarTitle } from "../shared/stats_var_titles";
import { NamedTypedNode } from "../shared/types";
import theme from "../theme/theme";
import { CategoryConfig } from "../types/subject_page_proto_types";
import { getParentPlacesPromise } from "../utils/place_utils";

interface RankingPagePropType {
  // Name of the parent place the ranking page is for
  parentPlaceName: string;
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
}

export const RankingPage = (props: RankingPagePropType): React.JSX.Element => {
  const [parentPlaces, setParentPlaces] = useState<NamedTypedNode[]>([]);

  // Get the parent places for the subtitle
  useEffect(() => {
    const parentPlacesPromise = getParentPlacesPromise(props.parentPlaceDcid);
    parentPlacesPromise.then((parentPlaces) => {
      setParentPlaces(parentPlaces);
    });
  }, [props.parentPlaceDcid]);

  // Get the display name of the stat var, localized
  const statVarName = getStatsVarTitle(props.statVarDcid);
  const parentPlace: NamedTypedNode = {
    name: props.parentPlaceName,
    dcid: props.parentPlaceDcid,
    types: [],
  };

  // Get the pluralized place type for the page title
  const pluralPlaceType = displayNameForPlaceType(
    props.childPlaceType,
    true /* isPlural */
  );

  // Get the page title
  const pageTitle = `Ranking by ${statVarName} for ${pluralPlaceType} in ${props.parentPlaceName}`;

  // Get localized links for the subtitle
  const parentPlacesLinks = parentPlaces.map((parent, index) => {
    return (
      <span key={parent.dcid}>
        <LocalizedLink
          className="place-info-link"
          href={`/place/${parent.dcid}`}
          text={parent.name}
        />
        {index < parentPlaces.length - 1 ? ", " : ""}
      </span>
    );
  });

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
        <div
          css={css`
            ${theme.typography.family.heading}
            ${theme.typography.heading.xs}
            font-weight: 500;
            margin-bottom: 32px;
          `}
        >
          {parentPlacesLinks}
        </div>
        <Category
          config={getCategoryConfig(props, statVarName)}
          enclosedPlaceType={props.childPlaceType}
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
