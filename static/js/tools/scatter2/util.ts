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

/**
 * Retrieves the DCIDs of child places of a certain type contained in a parent place.
 * @param dcid
 * @param type
 */
async function getPlacesIn(dcid: string, type: string): Promise<Array<string>> {
  const resp = await axios.get(
    `/api/place/places-in?dcids=${dcid}&placeType=${type}`
  );
  return resp.data[dcid];
}

/**
 * Gets the latest value for a place of a timeseries.
 * @param place
 * @param statVar
 */
async function getTimeSeriesLatestPoint(
  place: string,
  statVar: string
): Promise<number> {
  const resp = await axios.get(
    `/api/stats/value?place=${place}&stat_var=${statVar}`
  );
  return resp.data.value;
}

export { getPlacesIn, getTimeSeriesLatestPoint };
