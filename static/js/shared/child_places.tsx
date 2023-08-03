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
 * List of child places for navigation.
 */

import _ from "lodash";
import React from "react";

import { displayNameForPlaceType } from "../place/util";
import { ChildPlacesByType, NamedTypedPlace } from "../shared/types";
import { formatString, ReplacementStrings } from "../utils/tile_utils";

interface ChildPlacesPropType {
  parentPlace: NamedTypedPlace;
  childPlaces: ChildPlacesByType;
  // Format string must include ${placeDcid} for child place URLs.
  urlFormatString: string;
}

export function ChildPlaces(props: ChildPlacesPropType): JSX.Element {
  if (_.isEmpty(props.childPlaces) || !props.parentPlace) {
    return null;
  }
  const firstType = displayNameForPlaceType(
    Object.keys(props.childPlaces)[0],
    true /* isPlural */
  );
  const numTypes = Object.keys(props.childPlaces).length;

  return (
    <div id="child-places">
      {numTypes == 1 && (
        <span id="child-place-head">
          {firstType} in {props.parentPlace.name}
        </span>
      )}
      {numTypes > 1 && (
        <span id="child-place-head">Places in {props.parentPlace.name}</span>
      )}
      {Object.keys(props.childPlaces)
        .sort()
        .map((placeType) => (
          <div key={placeType} className="child-place-group">
            {numTypes > 1 && (
              <div className="child-place-type">
                {displayNameForPlaceType(placeType, true /* isPlural */)}
              </div>
            )}
            {props.childPlaces[placeType].map((place, i) => {
              const rs: ReplacementStrings = {
                placeDcid: place.dcid,
              };
              return (
                <a
                  href={formatString(props.urlFormatString, rs)}
                  className="child-place-link"
                  key={`child-place-${i}`}
                >
                  {place.name || place.dcid}
                  {i < props.childPlaces[placeType].length - 1 ? "," : ""}
                </a>
              );
            })}
          </div>
        ))}
    </div>
  );
}
