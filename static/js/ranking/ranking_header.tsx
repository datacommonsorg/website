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

import React, { useEffect, useState } from "react";
import { FormattedMessage, IntlProvider } from "react-intl";

import { LocalizedLink } from "../i18n/i18n";
import { rankingMessages } from "../i18n/i18n_ranking_messages";
import { displayNameForPlaceType } from "../place/util";
import { NamedTypedNode } from "../shared/types";
import { getParentPlacesPromise, getPlaceNames } from "../utils/place_utils";

export interface RankingPageHeaderPropType {
  parentPlaceNameLocalized: string;
  parentPlaceDcid: string;
  childPlaceType: string;
  statVarNameLocalized: string;
  locale: string;
}

export function RankingPageHeader(
  props: RankingPageHeaderPropType
): React.JSX.Element {
  const ancestorPlaces = useAncestorPlaces(props.parentPlaceDcid, props.locale);
  return (
    <IntlProvider locale={props.locale}>
      <div className="ranking-header-container">
        <h1>
          {getPageTitle(
            props.statVarNameLocalized,
            props.childPlaceType,
            props.parentPlaceDcid,
            props.parentPlaceNameLocalized
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
    </IntlProvider>
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
    const parentPlacesPromise = getParentPlacesPromise(placeDcid);
    parentPlacesPromise.then(async (ancestorPlaces) => {
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
    });
  }, [locale, placeDcid]);

  return ancestorPlacesLocalized;
}

/** Get the page title, which includes a localizedlink to the place page of the parent place */
function getPageTitle(
  statVarName: string,
  childPlaceType: string,
  parentPlaceDcid: string,
  parentPlaceName: string
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
        text={parentPlaceName}
      />
    </span>
  );
  return (
    <FormattedMessage
      id={rankingMessages.pageTitle.id}
      defaultMessage={rankingMessages.pageTitle.defaultMessage}
      values={{
        statVarName,
        pluralPlaceType,
        placeName: parentPlaceLink,
      }}
    />
  );
}
