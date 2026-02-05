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

import { NamedTypedPlace } from "../../../shared/types";
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../../utils/place_utils";
import {
  AA1_AA2_CHILD_PLACE_TYPES,
  AA1_AA2_PLACES,
  ALL_PLACE_CHILD_TYPES,
  CHILD_PLACE_TYPE_MAPPING,
  EUROPE_CHILD_PLACE_TYPES,
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
  let enclosedChildTypes = {};
  if (selectedPlace.types.some((type) => type.startsWith("Eurostat"))) {
    // If place is a Eurostat place, use the europe child place types
    enclosedChildTypes = EUROPE_CHILD_PLACE_TYPES;
  } else {
    // Iterate through parent places (including the current place) to figure out
    // which child place type mapping to use.
    for (const parentPlace of [selectedPlace, ...parentPlaces]) {
      if (parentPlace.dcid in CHILD_PLACE_TYPE_MAPPING) {
        enclosedChildTypes = CHILD_PLACE_TYPE_MAPPING[parentPlace.dcid];
        break;
      }
      if (AA1_AA2_PLACES.has(parentPlace.dcid)) {
        enclosedChildTypes = AA1_AA2_CHILD_PLACE_TYPES;
        break;
      }
    }
  }
  const childPlaceTypes = [];
  for (const type of selectedPlace.types) {
    if (type in enclosedChildTypes) {
      childPlaceTypes.push(...enclosedChildTypes[type]);
      break;
    }
  }
  for (const type in ALL_PLACE_CHILD_TYPES) {
    if (selectedPlace.types.indexOf(type) > -1) {
      childPlaceTypes.push(...ALL_PLACE_CHILD_TYPES[type]);
    }
  }
  return Array.from(new Set(childPlaceTypes));
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
