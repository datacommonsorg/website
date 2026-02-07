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
  EUROPE_NAMED_TYPED_PLACE,
  USA_PLACE_DCID,
} from "../../../shared/constants";
import { NamedTypedPlace } from "../../../shared/types";
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../../utils/place_utils";
import { isChildPlaceOf } from "../../shared_util";
import {
  COUNTRIES_WITH_AA1_AND_AA2_MAPS,
  DEFAULT_CHILD_PLACE_TYPE_HIERARCHY,
  EUROPE_CHILD_PLACE_TYPE_HIERARCHY,
  MAPS_AA1_AA2_CHILD_PLACE_TYPE_HIERARCHY,
  MAPS_DEFAULT_PLACE_TYPE_HIERARCHY,
  MAPS_SPECIAL_HANDLING_HIERARCHY_MAPPING,
  USA_CHILD_PLACE_TYPE_HIERARCHY,
} from "./place_select_constants";

type NamedTypedCallbackFn = (place: NamedTypedPlace) => void;
type PlaceDcidCallbackFn = (placeDcid: string) => void;

/**
 * Get child place types of a selected place.
 *
 * Alerts if there are no child place types.
 *
 * @param selectedPlace place to get child place types for.
 * @param requireMaps whether the returned child place types should be filtered by maps availability
 * @returns array of place types the selected place encloses.
 */
export async function loadChildPlaceTypes(
  selectedPlace: NamedTypedPlace,
  requireMaps?: boolean
): Promise<string[]> {
  const parentPlaces = await getParentPlacesPromise(selectedPlace.dcid);
  if (requireMaps) {
    return getEnclosedPlaceTypesWithMaps(selectedPlace, parentPlaces);
  }
  return getEnclosedPlaceTypes(selectedPlace, parentPlaces);
}

/**
 * Get valid child place types of a selected place given its parent places
 *
 * Note: This function uses a containment hierarchy specified by
 * place_select_constants.ts instead of reading the knowledge graph.
 * Requires the parent places of the selected place to determine if the
 * selected place is within the US or Europe, which gets special handling.
 *
 * @param selectedPlace place to get child place types for.
 * @param parentPlaces parent places of the selected place.
 * @returns array of place types the selected place encloses.
 */
export function getEnclosedPlaceTypes(
  selectedPlace: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): string[] {
  if (selectedPlace.dcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return DEFAULT_CHILD_PLACE_TYPE_HIERARCHY[EARTH_NAMED_TYPED_PLACE.types[0]];
  }
  if (_.isEmpty(selectedPlace.types)) {
    return [];
  }
  const isUSPlace = isChildPlaceOf(
    selectedPlace.dcid,
    USA_PLACE_DCID,
    parentPlaces
  );
  const isEuropePlace = isChildPlaceOf(
    selectedPlace.dcid,
    EUROPE_NAMED_TYPED_PLACE.dcid,
    parentPlaces
  );

  for (const type of selectedPlace.types) {
    if (isUSPlace) {
      if (type in USA_CHILD_PLACE_TYPE_HIERARCHY) {
        return USA_CHILD_PLACE_TYPE_HIERARCHY[type];
      }
    } else if (isEuropePlace) {
      if (type in EUROPE_CHILD_PLACE_TYPE_HIERARCHY) {
        return EUROPE_CHILD_PLACE_TYPE_HIERARCHY[type];
      }
    } else {
      if (type in DEFAULT_CHILD_PLACE_TYPE_HIERARCHY) {
        return DEFAULT_CHILD_PLACE_TYPE_HIERARCHY[type];
      }
    }
  }
  return [];
}

/**
 * Get valid child place types of a selected place given its parent places that
 * have both data and maps available.
 *
 * This is typically a subset of the child place types returned by
 * getEnclosedPlaceTypes, because we don't have geojsons available for all child
 * place types.
 *
 * Note: This function uses a containment hierarchy specified by
 * place_select_constants.ts instead of reading the knowledge graph.
 * Requires the parent places of the selected place to determine if the
 * selected place is within the US or Europe, which gets special handling.
 *
 * @param selectedPlace place to get child place types for.
 * @param parentPlaces parent places of the selected place.
 * @returns array of place types the selected place encloses.
 */
export function getEnclosedPlaceTypesWithMaps(
  selectedPlace: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[]
): string[] {
  // First, determine which containment hierarchy to use based on the selected place's type(s).
  // This is a mapping of parent place type -> child place types to show in the child place type selector.
  let typeHierarchy: { [key: string]: string[] } =
    MAPS_DEFAULT_PLACE_TYPE_HIERARCHY;

  for (const parentPlace of [selectedPlace, ...parentPlaces]) {
    // Check if the selected place or any of its parent places
    // have a different child place type hierarchy than the default.
    if (parentPlace.dcid in MAPS_SPECIAL_HANDLING_HIERARCHY_MAPPING) {
      typeHierarchy = MAPS_SPECIAL_HANDLING_HIERARCHY_MAPPING[parentPlace.dcid];
      break;
    } else if (COUNTRIES_WITH_AA1_AND_AA2_MAPS.has(parentPlace.dcid)) {
      typeHierarchy = MAPS_AA1_AA2_CHILD_PLACE_TYPE_HIERARCHY;
      break;
    }
  }

  // For each type of the selected place, find the child place types in the hierarchy.
  const childPlaceTypes = [];
  for (const type of selectedPlace.types) {
    if (type in typeHierarchy) {
      childPlaceTypes.push(...typeHierarchy[type]);
      break;
    }
  }

  // Merge any duplicates
  // Typescript Set() preserves order by keeping first occurrence of any duplicates
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
