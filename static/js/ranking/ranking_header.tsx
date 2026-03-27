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
 * Component for rendering the header of a ranking page.
 */

import React, { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

import { LocalizedLink } from "../i18n/i18n";
import { rankingMessages } from "../i18n/i18n_ranking_messages";
import { displayNameForPlaceType } from "../place/util";
import { NamedTypedNode } from "../shared/types";
import { getParentPlacesPromise, getPlaceNames } from "../utils/place_utils";

export interface RankingPageHeaderPropType {
  // Name of the parent place the ranking page is for, already localized
  parentPlaceNameLocalized: string;
  // DCID of the parent place
  parentPlaceDcid: string;
  // Type of the places to be ranked. Must be a child place type of withinPlace.
  childPlaceType: string;
  // Name of the stat var, already localized
  statVarNameLocalized: string;
  // Locale of the page
  locale: string;
  // Whether all child places are shown in the ranking tile
  areAllPlacesShown: boolean;
  // Number of places to display in the ranking tile
  numPlacesShown: number;
  // Whether the stat var is per capita
  isPerCapita: boolean;
}

export function RankingPageHeader(
  props: RankingPageHeaderPropType
): React.JSX.Element {
  const ancestorPlaces = useAncestorPlaces(props.parentPlaceDcid, props.locale);
  return (
    <div className="ranking-header-container">
      <h1>
        {getPageTitle(
          props.statVarNameLocalized,
          props.childPlaceType,
          props.parentPlaceDcid,
          props.parentPlaceNameLocalized,
          props.areAllPlacesShown,
          props.numPlacesShown,
          props.isPerCapita
        )}
      </h1>
      <div className="ancestor-places-links">
        {ancestorPlaces.map((ancestor, index) => {
          return (
            <span key={ancestor.dcid}>
              <LocalizedLink
                className="place-info-link"
                href={`/place/${ancestor.dcid}`}
                text={ancestor.name}
              />
              {index < ancestorPlaces.length - 1 ? ", " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Get the list of ancestor places for a given place, with localized names
 *
 * @param placeDcid - The DCID of the place to get ancestor places for
 * @param locale - The locale of the page
 * @returns A list of ancestor places, from smallest to largest, with localized names
 */
function useAncestorPlaces(
  placeDcid: string,
  locale: string
): NamedTypedNode[] {
  const [ancestorPlacesLocalized, setAncestorPlacesLocalized] = useState<
    NamedTypedNode[]
  >([]);

  // Get the ancestor places for the subtitle
  useEffect(() => {
    const fetchAncestors = async (): Promise<void> => {
      try {
        const ancestorPlaces = await getParentPlacesPromise(placeDcid);
        // get the localized name for each parent to display
        const localizedPlaceNames = await getPlaceNames(
          ancestorPlaces.map((ancestor) => ancestor.dcid),
          {
            locale,
          }
        );
        // Replace default ancestor places names with their localized name
        const localizedAncestorPlaces = ancestorPlaces.map((ancestor) => {
          return {
            ...ancestor,
            name: localizedPlaceNames[ancestor.dcid],
          };
        });
        setAncestorPlacesLocalized(localizedAncestorPlaces);
      } catch (error) {
        console.error("Failed to fetch ancestor places:", error);
      }
    };

    fetchAncestors();
  }, [locale, placeDcid]);

  return ancestorPlacesLocalized;
}

/** Get the page title, which includes a localizedlink to the place page of the parent place
 *
 * @param statVarNameLocalized - The localized name of the stat var
 * @param childPlaceType - The type of the places to be ranked
 * @param parentPlaceDcid - The DCID of the parent place
 * @param parentPlaceNameLocalized - The localized name of the parent place
 * @param areAllPlacesShown - Whether all child places are shown in the ranking tile
 * @param numPlacesShown - Number of places to display in the ranking tile
 * @param isPerCapita - Whether the stat var is per capita
 * @returns The page title
 */
function getPageTitle(
  statVarNameLocalized: string,
  childPlaceType: string,
  parentPlaceDcid: string,
  parentPlaceNameLocalized: string,
  areAllPlacesShown: boolean,
  numPlacesShown: number,
  isPerCapita: boolean
): React.JSX.Element {
  // Get the pluralized place type (e.g. county -> counties)
  const pluralPlaceType = displayNameForPlaceType(
    childPlaceType,
    true /* isPlural */
  );
  // Generate a link to the place page of the parent place
  const parentPlaceLink = (
    <span key={parentPlaceDcid}>
      <LocalizedLink
        className="place-info-link"
        href={`/place/${parentPlaceDcid}`}
        text={parentPlaceNameLocalized}
      />
    </span>
  );
  // First half of the title
  const pageTitlePrefix = (
    <FormattedMessage
      id={rankingMessages.pageTitlePrefix.id}
      defaultMessage={rankingMessages.pageTitlePrefix.defaultMessage}
      values={{ statVar: statVarNameLocalized }}
    />
  );
  // Determine which second half message to use
  // based on whether all places are shown and whether the stat var is per capita
  const pageTitleSuffixMessage = areAllPlacesShown
    ? isPerCapita
      ? rankingMessages.allPlacesPerCapitaTitle
      : rankingMessages.allPlacesTitle
    : isPerCapita
    ? rankingMessages.topPlacesPerCapita
    : rankingMessages.topPlacesTitle;
  return (
    <>
      {pageTitlePrefix}
      {", "}
      <FormattedMessage
        id={pageTitleSuffixMessage.id}
        defaultMessage={pageTitleSuffixMessage.defaultMessage}
        values={{
          rankSize: numPlacesShown,
          pluralPlaceType,
          placeName: parentPlaceLink,
        }}
      />
    </>
  );
}
