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
import React, { useEffect, useState } from "react";

import { displayNameForPlaceType } from "../../place/util";
import { ChildPlacesByType, NamedTypedPlace } from "../../shared/types";
import { getChildPlacesPromise } from "../../utils/place_utils";

interface ChildPlacesPropType {
  parentPlace: NamedTypedPlace;
}

export function ChildPlaces(props: ChildPlacesPropType): JSX.Element {
  const [childPlaces, setChildPlaces] = useState<
    ChildPlacesByType | undefined
  >();

  useEffect(() => {
    getChildPlacesPromise(props.parentPlace.dcid).then((childPlaces) =>
      setChildPlaces(childPlaces)
    );
  }, []);

  if (_.isEmpty(childPlaces) || !props.parentPlace) {
    return null;
  }

  return (
    <div id="child-places">
      <span id="child-place-head">Places in {props.parentPlace.name}</span>
      {Object.keys(childPlaces).map((placeType) => (
        <div key={placeType} className="child-place-group">
          <div className="child-place-type">
            {displayNameForPlaceType(placeType, true /* isPlural */)}
          </div>
          {childPlaces[placeType].map((place, i) => (
            <a
              href={"/disasters/" + place.dcid}
              className="child-place-link"
              key={`child-place-${i}`}
            >
              {place.name || place.dcid}
              {i < childPlaces[placeType].length - 1 ? "," : ""}
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
