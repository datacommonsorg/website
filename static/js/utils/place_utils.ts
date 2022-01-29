/**
 * Copyright 2022 Google LLC
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

import _ from "lodash";

import { EARTH_NAMED_TYPED_PLACE } from "../shared/constants";
import { NamedPlace } from "../shared/types";

const DEFAULT_SAMPLE_SIZE = 50;
const CURATED_SAMPLE_PLACES = {
  [EARTH_NAMED_TYPED_PLACE.dcid]: {
    Country: [
      { dcid: "country/USA", name: "United States of America" },
      { dcid: "country/MEX", name: "Mexico" },
      { dcid: "country/BRA", name: "Brazil" },
      { dcid: "country/DEU", name: "Germany" },
      { dcid: "country/POL", name: "Poland" },
      { dcid: "country/RUS", name: "Russia" },
      { dcid: "country/ZAF", name: "South Africa" },
      { dcid: "country/ZWE", name: "Zimbabwe" },
      { dcid: "country/CHN", name: "People's Republic of China" },
      { dcid: "country/IND", name: "India" },
      { dcid: "country/AUS", name: "Australia" },
    ],
  },
};

/**
 * Get a subset of the list of places that are of childPlaceType and are
 * children of the parentPlace
 * @param parentPlace
 * @param childPlaceType
 * @param childrenPlaces
 * @param sampleSize
 */
export function getSamplePlaces(
  parentPlace: string,
  childPlaceType: string,
  childrenPlaces: Array<NamedPlace>,
  sampleSize?: number
): Array<NamedPlace> {
  if (
    parentPlace in CURATED_SAMPLE_PLACES &&
    childPlaceType in CURATED_SAMPLE_PLACES[parentPlace]
  ) {
    return CURATED_SAMPLE_PLACES[parentPlace][childPlaceType];
  }
  return _.sampleSize(childrenPlaces, sampleSize || DEFAULT_SAMPLE_SIZE);
}
