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
  const { ancestorPlaces, ancestorPlaceLocalizedNames } = useAncestorPlaces(
    props.parentPlaceDcid,
    props.locale
  );
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
          {ancestorPlaces.map((parent, index) => {
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
          })}
        </div>
      </div>
    </IntlProvider>
  );
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
