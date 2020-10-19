/**
 * Copyright 2020 Google LLC
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
import _ from "lodash";
import { getApiRoot, getApiKey } from "../../shared/util";

interface ApiPlaceInfo {
  name: string;
  dcid: string;
  pop: number;
}

interface ApiPlace {
  place: string;
}

async function getPlacesIn(dcid: string, type: string): Promise<Array<string>> {
  const resp = await axios.get(
    `${getApiRoot()}/node/places-in?dcids=${dcid}&placeType=${type}`
  );
  const places: Array<ApiPlace> = JSON.parse(resp.data.payload);
  return places.map((place) => place.place);
}

async function getPopulations(
  places: Array<string>,
  denominator?: string
): Promise<Record<string, number>> {
  const promises = places.map((dcid) =>
    axios.get(
      `${getApiRoot()}/stat/value?place=${dcid}&stat_var=${
        denominator ? "Count_Person" : denominator
      }`
    )
  );
  return Promise.all(promises).then((resps) => {
    const dcidToPopulation = {};
    resps.forEach((resp, i) => (dcidToPopulation[places[i]] = resp.data));
    return dcidToPopulation;
  });
}

async function getChildPlaces(
  dcid: string
): Promise<Record<string, ApiPlaceInfo[]>> {
  const resp = await axios.get(`/api/place/child/${dcid}`);
  return resp.data;
}

async function getTimeSeriesLatestPoint(
  place: string,
  statVar: string
): Promise<number> {
  const resp = await axios.get(
    `${getApiRoot()}/stat/value?place=${place}&stat_var=${statVar}&key=${getApiKey()}`
  );
  // TODO: Error handling
  return resp.data.value;
}

export {
  getPlacesIn,
  getPopulations,
  getChildPlaces,
  ApiPlaceInfo,
  getTimeSeriesLatestPoint,
};
