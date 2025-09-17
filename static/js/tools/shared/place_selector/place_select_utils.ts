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
} from "../../../shared/constants";
import { NamedTypedPlace } from "../../../shared/types";
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../../utils/place_utils";
import { isChildPlaceOf } from "../../shared_util";
import {
  CHILD_PLACE_TYPES,
  USA_CHILD_PLACE_TYPES,
} from "./place_select_constants";

type NamedTypedCallbackFn = (place: NamedTypedPlace) => void;
type PlaceDcidCallbackFn = (placeDcid: string) => void;

/**
 * Get child place types of a selected place.
 *
 * Alerts if there are no child place types.
 *
 * @param selectedPlace place to get child place types for.
 * @returns array of place types the selected place encloses.
 */
export async function loadChildPlaceTypes(
  selectedPlace: NamedTypedPlace
): Promise<string[]> {
  const parentPlaces = await getParentPlacesPromise(selectedPlace.dcid);
  return getEnclosedPlaceTypes(selectedPlace, parentPlaces);
}

/**
 * Get child place types of a selected place given its parent places.
 *
 * Note: This function uses a containment hierarchy specified by
 * place_select_constants.ts instead of reading the knowledge graph.
 * Requires the parent places of the selected place to determine if the
 * selected place is within the US, which gets special handling.
 *
 * @param selectedPlace place to get child place types for.
 * @param parentPlaces parent places of the selected place.
 * @returns array of place types the selected place encloses.
 */
function getEnclosedPlaceTypes(
  selectedPlace: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): string[] {
  if (selectedPlace.dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return CHILD_PLACE_TYPES[EARTH_NAMED_TYPED_PLACE.types[0]];
  }
  if (_.isEmpty(selectedPlace.types)) {
    return [];
  }
  const isUSPlace = isChildPlaceOf(
    selectedPlace.dcid,
    USA_PLACE_DCID,
    parentPlaces
  );
  for (const type of selectedPlace.types) {
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

/**
 * Convert a function that expects namedTypedPlace as input to a
 * function that expects the dcid of the namedTypedPlace as input.
 *
 * @param namedTypedFn function to convert
 * @returns new function with place dcid as input
 */
export function getPlaceDcidCallback(
  namedTypedFn: NamedTypedCallbackFn
): PlaceDcidCallbackFn {
  async function placeDcidFn(placeDcid: string): Promise<void> {
    if (!namedTypedFn) {
      return;
    }
    const namedTypedPlace = await getNamedTypedPlace(placeDcid);
    namedTypedFn(namedTypedPlace);
  }
  return placeDcidFn;
}
