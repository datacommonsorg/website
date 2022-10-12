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

/**
 * Geo Json data.
 */

import axios from "axios";

import { GeoJsonData } from "../../chart/types";
import { IPCC_PLACE_50_TYPE_DCID } from "../../shared/constants";

export const MANUAL_GEOJSON_DISTANCES = {
  [IPCC_PLACE_50_TYPE_DCID]: 0.5,
};

export function fetchGeoJson(
  parentPlace: string,
  childType: string,
  setGeoJson: (data: GeoJsonData) => void
): void {
  console.log("fetch geo json data");
  axios
    .get(
      `/api/choropleth/geojson?placeDcid=${parentPlace}&placeType=${childType}`
    )
    .then((resp) => {
      setGeoJson(resp.data);
    });
}
