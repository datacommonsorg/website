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
 * Util functions used by the disaster dashboard.
 */

import { EARTH_NAMED_TYPED_PLACE } from "../../shared/constants";
import { NamedTypedPlace } from "../../shared/types";
import { ALL_MAP_PLACE_TYPES } from "../../tools/map/util";

/**
 * Get list of relevant parent places for a specific place.
 * @param parentPlaces raw list of all parent places
 * @param place place to get filtered parent places for
 */
export function getFilteredParentPlaces(
  parentPlaces: NamedTypedPlace[],
  place: NamedTypedPlace
): NamedTypedPlace[] {
  const filteredParentPlaces = parentPlaces.filter((parent) => {
    for (const type of parent.types) {
      if (type in ALL_MAP_PLACE_TYPES) {
        return true;
      }
    }
    return false;
  });
  if (place.dcid !== EARTH_NAMED_TYPED_PLACE.dcid) {
    filteredParentPlaces.push(EARTH_NAMED_TYPED_PLACE);
  }
  return filteredParentPlaces;
}
