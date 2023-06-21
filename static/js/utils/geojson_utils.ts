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
 * Util functions used for getting geojson data.
 */

import axios from "axios";

import { GeoJsonData } from "../chart/types";

/**
 * Get promise for geojson data for a list of events and a geojson prop
 * @param nodes dcids of nodes to get geojson for
 * @param geoJsonProp prop to use to get the geojson
 */
export function fetchNodeGeoJson(
  nodes: string[],
  geoJsonProp: string,
  apiRoot?: string
): Promise<GeoJsonData> {
  if (!nodes.length || !geoJsonProp) {
    return Promise.resolve({
      type: "FeatureCollection",
      features: [],
      properties: { currentGeo: "" },
    });
  }
  return axios
    .post<GeoJsonData>(`${apiRoot || ""}/api/choropleth/node-geojson`, {
      nodes,
      geoJsonProp,
    })
    .then((resp) => {
      return resp.data as GeoJsonData;
    })
    .catch(() => {
      return null;
    });
}
