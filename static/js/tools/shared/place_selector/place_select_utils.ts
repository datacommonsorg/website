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

import { NamedTypedPlace } from "../../../shared/types";
import {
  getNamedTypedPlace,
  getParentPlacesPromise,
} from "../../../utils/place_utils";
import {
  DEFAULT_HIERARCHY,
  DEFAULT_OVERRIDES,
  MAPS_DEFAULT_HIERARCHY,
  MAPS_OVERRIDES,
  MAPS_UNIVERSAL_CHILDREN,
  UNIVERSAL_CHILDREN,
} from "./place_select_constants";

type NamedTypedCallbackFn = (place: NamedTypedPlace) => void;
type PlaceDcidCallbackFn = (placeDcid: string) => void;

/**
 * Gets the appropriate child place type hierarchy configuration for a selected place.
 * Used as a helper function for loadChildPlaceTypes.
 *
 * This function checks if the given place or any of its parent places have a
 * specific override defined in the hierarchy configuration. If an override
 * is found (e.g., for a specific country), it returns that specific hierarchy.
 * Otherwise, it falls back to the global default hierarchy.
 *
 * @param selectedPlace The place currently selected.
 * @param parentPlaces An array of the selected place's parent places.
 * @param requireMaps Whether to return only the hierarchy of places that have map boundaries available.
 * @returns A mapping of place types to their corresponding valid child place types.
 */
export function getHierarchyConfigForPlace(
  selectedPlace: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[],
  requireMaps?: boolean
): Record<string, string[]> {
  for (const place of [selectedPlace, ...parentPlaces]) {
    // Iterate through the selected place and its parent places to check for override
    const overrides = requireMaps ? MAPS_OVERRIDES : DEFAULT_OVERRIDES;
    if (place.dcid in overrides) {
      return overrides[place.dcid];
    }
  }
  // If no override is found, return the default hierarchy
  return requireMaps ? MAPS_DEFAULT_HIERARCHY : DEFAULT_HIERARCHY;
}

/**
 * Get child place types of a selected place.
 *
 * @param selectedPlace place to get child place types for.
 * @param requireMaps whether the returned child place types should be filtered by maps availability
 * @returns array of place types the selected place encloses.
 */
export async function loadChildPlaceTypes(
  selectedPlace: NamedTypedPlace,
  requireMaps?: boolean
): Promise<string[]> {
  if (_.isEmpty(selectedPlace.types)) {
    return [];
  }
  // Get hierarchy configuration for the selected place
  const parentPlaces = await getParentPlacesPromise(selectedPlace.dcid);
  const hierarchy = getHierarchyConfigForPlace(
    selectedPlace,
    parentPlaces,
    requireMaps
  );

  // Get universal child place types for the selected place
  const universal = requireMaps ? MAPS_UNIVERSAL_CHILDREN : UNIVERSAL_CHILDREN;

  // Get child place types for the selected place, based on the hierarchy configuration
  for (const type of selectedPlace.types) {
    // Find the first place type that has a hierarchy configuration, use that configuration
    if (type in hierarchy || type in universal) {
      const specificChildren = hierarchy[type] || [];
      const universalChildren = universal[type] || [];
      return _.union(specificChildren, universalChildren);
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
  namedTypedFn?: NamedTypedCallbackFn | null
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
