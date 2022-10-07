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

import { GeoJsonData, GeoJsonFeature } from "../../chart/types";
import { IPCC_PLACE_50_TYPE_DCID } from "../../shared/constants";
import { PlaceInfo } from "./context";

export const MANUAL_GEOJSON_DISTANCES = {
  [IPCC_PLACE_50_TYPE_DCID]: 0.5,
};

export function fetchGeoJson(
  placeInfo: PlaceInfo,
  setGeoJson: (data: GeoJsonData) => void
): void {
  axios
    .get(
      `/api/choropleth/geojson?placeDcid=${placeInfo.enclosingPlace.dcid}&placeType=${placeInfo.enclosedPlaceType}`
    )
    .then((resp) => {
      setGeoJson(resp.data);
    });
}

export function getGeoJsonDataFeatures(
  placeDcids: string[],
  enclosedPlaceType: string
): GeoJsonFeature[] {
  const distance = MANUAL_GEOJSON_DISTANCES[enclosedPlaceType];
  if (!distance) {
    return [];
  }
  const geoJsonFeatures = [];
  for (const placeDcid of placeDcids) {
    const dcidPrefixSuffix = placeDcid.split("/");
    if (dcidPrefixSuffix.length < 2) {
      continue;
    }
    const latlon = dcidPrefixSuffix[1].split("_");
    if (latlon.length < 2) {
      continue;
    }
    const neLat = Number(latlon[0]) + distance / 2;
    const neLon = Number(latlon[1]) + distance / 2;
    const placeName = `${latlon[0]}, ${latlon[1]} (${distance} arc degree)`;
    // TODO: handle cases of overflowing 180 near the international date line
    // becasuse not sure if drawing libraries can handle this
    geoJsonFeatures.push({
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [neLon, neLat],
              [neLon, neLat - distance],
              [neLon - distance, neLat - distance],
              [neLon - distance, neLat],
              [neLon, neLat],
            ],
          ],
        ],
      },
      id: placeDcid,
      properties: { geoDcid: placeDcid, name: placeName },
      type: "Feature",
    });
  }
  return geoJsonFeatures;
}
