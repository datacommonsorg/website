import { getStatsVarLabel } from "../shared/stats_var_labels";
import { StatVarMetadata } from "./../types/stat_var";
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

// When a new placeholder is added in any topic page config, add that
// placeholder as a field in this object.
export interface ReplacementStrings {
  place: string;
  date: string;
  statVar?: string;
}

export function formatString(s: string, rs: ReplacementStrings): string {
  let formattedString = s;
  for (const key in rs) {
    const re = new RegExp(`\\$\\{${key}\\}`, "g");
    formattedString = formattedString.replace(re, rs[key]);
  }
  return formattedString;
}

export function getStatVarName(
  statVarDcid: string,
  statVars: StatVarMetadata[],
  isPerCapita?: boolean
): string {
  for (const svm of statVars) {
    if (svm.statVar === statVarDcid) {
      if (svm.name) {
        return svm.name;
      }
      break;
    }
  }
  const label = getStatsVarLabel(statVarDcid);
  if (isPerCapita) {
    return `${label} Per Capita`;
  }
  return label;
}
