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

export function getHierarchyConfigForPlace(
  selectedPlace: NamedTypedPlace,
  parentPlaces: NamedTypedPlace[],
  requireMaps?: boolean
): Record<string, string[]> {
  for (const place of [selectedPlace, ...parentPlaces]) {
    const overrides = requireMaps ? MAPS_OVERRIDES : DEFAULT_OVERRIDES;
    if (place.dcid in overrides) {
      return overrides[place.dcid];
    }
  }

  return requireMaps ? MAPS_DEFAULT_HIERARCHY : DEFAULT_HIERARCHY;
}

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

  if (_.isEmpty(selectedPlace.types)) {
    return [];
  }

  const hierarchy = getHierarchyConfigForPlace(
    selectedPlace,
    parentPlaces,
    requireMaps
  );

  const universal = requireMaps ? MAPS_UNIVERSAL_CHILDREN : UNIVERSAL_CHILDREN;

  for (const type of selectedPlace.types) {
    if (type in hierarchy || type in universal) {
      const specificChildren = hierarchy[type] || [];
      const universalChildren = universal[type] || [];
      return Array.from(new Set([...specificChildren, ...universalChildren]));
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
