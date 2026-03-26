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
import React, { useEffect } from "react";
import { IntlProvider } from "react-intl";

import { Category } from "../components/subject_page/category";
import { getStatsVarTitle } from "../shared/stats_var_titles";
import { NamedTypedNode } from "../shared/types";
import theme from "../theme/theme";
import { getChildPlacesPromise } from "../utils/place_utils";
import { getCategoryConfig } from "./ranking_config_builder";
import { RankingPageHeader } from "./ranking_header";
import { RankingPageContainer } from "./ranking_page_styles";

export interface RankingPagePropType {
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
  // Number of places to display in the ranking tile
  const [numEntriesToDisplay, setNumEntriesToDisplay] = React.useState(100);
  // Whether all child places are shown in the ranking tile
  const [areAllPlacesShown, setAreAllPlacesShown] = React.useState(false);

  // Determine whether all child places are shown in the ranking tile
  useEffect(() => {
    // Fetch the number of places of the child place type within the parent place
    getChildPlacesPromise(props.parentPlaceDcid).then((childPlaces) => {
      const numChildPlaces = childPlaces[props.childPlaceType].length;
      // All places are shown if the number of entries to display is greater than or equal to the number of child places
      setAreAllPlacesShown(numEntriesToDisplay >= numChildPlaces);
    });
  }, [numEntriesToDisplay, props.childPlaceType, props.parentPlaceDcid]);

  // Get the display name of the stat var, localized
  const statVarNameLocalized = getStatsVarTitle(props.statVarDcid);

  // The parent place as a NamedTypedNode, used for the Category component
  const parentPlaceLocalized: NamedTypedNode = {
    name: props.parentPlaceNameLocalized,
    dcid: props.parentPlaceDcid,
    types: [], // Unused for ranking tile
  };

  return (
    <IntlProvider locale={props.locale}>
      <ThemeProvider theme={theme}>
        <RankingPageContainer>
          <RankingPageHeader
            parentPlaceNameLocalized={props.parentPlaceNameLocalized}
            parentPlaceDcid={props.parentPlaceDcid}
            childPlaceType={props.childPlaceType}
            statVarNameLocalized={statVarNameLocalized}
            locale={props.locale}
            areAllPlacesShown={areAllPlacesShown}
            numPlacesShown={numEntriesToDisplay}
          />
          <Category
            config={getCategoryConfig(
              props,
              statVarNameLocalized,
              numEntriesToDisplay
            )}
            enclosedPlaceType={props.childPlaceType}
            eventTypeSpec={{}}
            id="ranking-page-category"
            place={parentPlaceLocalized}
            svgChartHeight={500}
          />
        </RankingPageContainer>
      </ThemeProvider>
    </IntlProvider>
  );
};
