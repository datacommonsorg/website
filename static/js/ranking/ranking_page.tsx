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
import React, { useEffect, useState } from "react";

import { Category } from "../components/subject_page/category";
import { intl, LocalizedLink } from "../i18n/i18n";
import { rankingMessages } from "../i18n/i18n_ranking_messages";
import { displayNameForPlaceType } from "../place/util";
import { getStatsVarTitle } from "../shared/stats_var_titles";
import { NamedTypedNode } from "../shared/types";
import theme from "../theme/theme";
import { CategoryConfig } from "../types/subject_page_proto_types";
import { getParentPlacesPromise, getPlaceNames } from "../utils/place_utils";

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
  // Locale of the page
  locale: string;
}

function useAncestorPlaces(
  parentPlaceDcid: string,
  locale: string
): {
  ancestorPlaces: NamedTypedNode[];
  ancestorPlaceLocalizedNames: Record<string, string>;
} {
  // Ancestor places of the parent place, from smallest to largest
  const [ancestorPlaces, setAncestorPlaces] = useState<NamedTypedNode[]>([]);
  // Mapping of ancestor place dcid to its localized name
  const [ancestorPlaceLocalizedNames, setAncestorPlaceLocalizedNames] =
    useState<Record<string, string>>({});

  // Get the ancestor places for the subtitle
  useEffect(() => {
    const parentPlacesPromise = getParentPlacesPromise(parentPlaceDcid);
    parentPlacesPromise.then(async (parentPlaces) => {
      // get the localized name for each parent to display
      setAncestorPlaceLocalizedNames(
        await getPlaceNames(
          parentPlaces.map((parent) => parent.dcid),
          {
            locale,
          }
        )
      );
      setAncestorPlaces(parentPlaces);
    });
  }, [locale, parentPlaceDcid]);

  return { ancestorPlaces, ancestorPlaceLocalizedNames };
}

export const RankingPage = (props: RankingPagePropType): React.JSX.Element => {
  const { ancestorPlaces, ancestorPlaceLocalizedNames } = useAncestorPlaces(
    props.parentPlaceDcid,
    props.locale
  );

  // Get the display name of the stat var, localized
  const statVarName = getStatsVarTitle(props.statVarDcid);

  // The parent place as a NamedTypedNode, used for the Category component
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
  const pageTitle = intl.formatMessage(rankingMessages.pageTitle, {
    statVarName,
    pluralPlaceType,
    placeName: props.parentPlaceName,
  });

  // Get localized links for the subtitle
  const ancestorPlacesLinks = ancestorPlaces.map((parent, index) => {
    return (
      <span key={parent.dcid}>
        <LocalizedLink
          className="place-info-link"
          href={`/place/${parent.dcid}`}
          text={ancestorPlaceLocalizedNames[parent.dcid]}
        />
        {index < ancestorPlaces.length - 1 ? ", " : ""}
      </span>
    );
  });

  return (
    <div>
      <ThemeProvider theme={theme}>
        <RankingPageContainer>
          <div className="ranking-header-container">
            <h1>{pageTitle}</h1>
            <div className="ancestor-places-links">{ancestorPlacesLinks}</div>
          </div>
          <Category
            config={getCategoryConfig(props, statVarName)}
            enclosedPlaceType={props.childPlaceType}
            eventTypeSpec={{}}
            id="ranking-page-category"
            place={parentPlace}
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
