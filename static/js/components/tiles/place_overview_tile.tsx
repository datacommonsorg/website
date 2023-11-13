/**
 * Copyright 2023 Google LLC
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
 * Component for rendering a place overview tile.
 */

import React from "react";
import { RawIntlProvider } from "react-intl";

import { intl } from "../../i18n/i18n";
import { Overview } from "../../place/overview";
import { NamedTypedPlace } from "../../shared/types";

interface PlaceOverviewTilePropType {
  place: NamedTypedPlace;
}

const NO_PLACE_EXPLORER_TYPES = new Set([
  "UNGeoRegion",
  "Continent",
  "GeoRegion",
  "ContinentalUnion",
]);

export function PlaceOverviewTile(
  props: PlaceOverviewTilePropType
): JSX.Element {
  // Overview should only show ranking if the place is inside the USA
  // Also use 'Learn _more_ about' if place is inside the USA
  const isUsaPlace = props.place.dcid.startsWith("geoId/");
  const skipLink =
    props.place.types.filter((type) => NO_PLACE_EXPLORER_TYPES.has(type))
      .length > 0;
  return (
    <>
      <div className="chart-container place-overview-tile">
        <RawIntlProvider value={intl}>
          <Overview
            dcid={props.place.dcid}
            showRanking={isUsaPlace}
            locale="en"
          />
        </RawIntlProvider>
        {!skipLink && (
          <div className="row">
            <a href={`/place/${props.place.dcid}`}>
              See {props.place.name} in Place Explorer
            </a>
          </div>
        )}
      </div>
    </>
  );
}
