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

interface SourceSeries {
  val: Record<string, number>;
  measurementMethod: string;
  importName: string;
  provenanceDomain: string;
  provenanceUrl: string;
  date: string;
}

async function getPlacesInNames(
  dcid: string,
  type: string
): Promise<Record<string, string>> {
  const resp = await axios.get(
    `/api/place/places-in-names?dcid=${dcid}&placeType=${type}`
  );
  return resp.data;
}

async function getStatsCollection(
  parent_place: string,
  child_type: string,
  date: string,
  statVars: Array<string>
): Promise<Record<string, SourceSeries>> {
  let statVarParams = "";
  for (const statVar of statVars) {
    statVarParams += `&stat_vars=${statVar}`;
  }
  const resp = await axios.get(
    `/api/stats/collection?parent_place=${parent_place}&child_type=${child_type}&date=${date}${statVarParams}`
  );
  // Tag `SourceSeries`'s with the requested date
  const data = resp.data;
  for (const dcid in data) {
    const sourceSeries = data[dcid];
    if (_.isEmpty(sourceSeries)) {
      continue;
    }
    sourceSeries["date"] = date;
  }
  return data;
}

export { getPlacesInNames, getStatsCollection, SourceSeries };
