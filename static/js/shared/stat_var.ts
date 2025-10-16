/**
 * Copyright 2021 Google LLC
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

interface StatVarInfo {
  // measurementDenominator
  md?: string;
  // measuredProperty
  mprop?: string;
  // populationType
  pt?: string;
  // constraint properties { property: value }
  pvs?: { [key: string]: string };
  // name
  title?: string;
  // statType
  st?: string;
  // measurementQualifier
  mq?: string;
  // true if the stat var has ranking pages
  ranked?: boolean;
  // true if the stat var can show per capita
  pcAllowed?: boolean;
}

function getStatVarInfo(dcids: string[]): Promise<Record<string, StatVarInfo>> {
  let url = "/api/stats/stat-var-property?";
  const urls = [];
  for (const dcid of dcids) {
    urls.push(`dcids=${dcid}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

interface StatVarNode {
  // key: statVar Id
  // value: object of two fields
  // 1) "paths" is an array of nodePath
  // 2) "denominators" is an array of possible per capita denominator DCIDs
  [key: string]: { paths: string[][]; denominators?: string[] };
}

export { getStatVarInfo, StatVarInfo, StatVarNode };
