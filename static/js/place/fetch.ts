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

import axios from "axios";

import {
  ChartBlockData,
  ChoroplethDataGroup,
  GeoJsonData,
} from "../chart/types";
import { EARTH_NAMED_TYPED_PLACE, USA_PLACE_DCID } from "../shared/constants";
import { USA_PLACE_TYPES_WITH_CHOROPLETH } from "./util";

/**
 * Get the geo json info for choropleth charts.
 */
export async function getGeoJsonData(
  dcid: string,
  locale: string
): Promise<GeoJsonData> {
  return axios
    .get(`/api/choropleth/geojson?placeDcid=${dcid}&hl=${locale}`)
    .then((resp) => {
      return resp.data;
    });
}

/**
 * Get the stat var data for choropleth charts.
 */
export async function getChoroplethData(
  dcid: string,
  spec: ChartBlockData
): Promise<ChoroplethDataGroup> {
  return axios
    .post(`/api/choropleth/data/${dcid}`, {
      spec,
    })
    .then((resp) => {
      return resp.data;
    });
}

export function shouldMakeChoroplethCalls(
  dcid: string,
  placeType: string
): boolean {
  const isEarth = dcid === EARTH_NAMED_TYPED_PLACE.dcid;
  const isInUSA: boolean =
    dcid.startsWith("geoId") || dcid.startsWith(USA_PLACE_DCID);
  return isEarth || (isInUSA && USA_PLACE_TYPES_WITH_CHOROPLETH.has(placeType));
}
