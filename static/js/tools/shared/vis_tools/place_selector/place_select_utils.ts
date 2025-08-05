/**
 * Copyright 2025 Google LLC
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
 * Helper functions for the place selector on our visualization tools
 */

import _ from "lodash";

import {
  EARTH_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../../../shared/constants";
import { NamedTypedPlace } from "../../../../shared/types";
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../../../utils/place_utils";
import { isChildPlaceOf } from "../../../shared_util";
import {
  CHILD_PLACE_TYPES,
  USA_CHILD_PLACE_TYPES,
} from "./place_select_constants";

export function loadChildPlaceTypes(
  selectedPlace: NamedTypedPlace
): Promise<string[]> {
  return getParentPlacesPromise(selectedPlace.dcid)
    .then((parentPlaces) => {
      const newChildPlaceTypes = getEnclosedPlaceTypes(
        selectedPlace,
        parentPlaces
      );
      if (_.isEmpty(newChildPlaceTypes)) {
        alert(
          `Sorry, we don't support ${selectedPlace.name}. Please select a different place.`
        );
        return [];
      }
      return newChildPlaceTypes;
    })
    .catch(() => {
      return [];
    });
}

function getEnclosedPlaceTypes(
  place: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): string[] {
  if (place.dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return CHILD_PLACE_TYPES[EARTH_NAMED_TYPED_PLACE.types[0]];
  }
  if (_.isEmpty(place.types)) {
    return [];
  }
  const isUSPlace = isChildPlaceOf(place.dcid, USA_PLACE_DCID, parentPlaces);
  for (const type of place.types) {
    if (isUSPlace) {
      if (type in USA_CHILD_PLACE_TYPES) {
        return USA_CHILD_PLACE_TYPES[type];
      }
    } else {
      if (type in CHILD_PLACE_TYPES) {
        return CHILD_PLACE_TYPES[type];
      }
    }
  }
  return [];
}

type NamedTypedCallbackFn = (place: NamedTypedPlace) => void;
type PlaceDcidCallbackFn = (placeDcid: string) => void;
export function getPlaceDcidCallback(
  namedTypedCallback: NamedTypedCallbackFn
): PlaceDcidCallbackFn {
  function placeDcidCallback(placeDcid: string): void {
    if (!namedTypedCallback) {
      return;
    }
    getNamedTypedPlace(placeDcid).then((namedTypedPlace) => {
      namedTypedCallback(namedTypedPlace);
    });
  }
  return placeDcidCallback;
}
