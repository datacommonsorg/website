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
 * Util functions used by tile components.
 */

import React from "react";

import { NL_SOURCE_REPLACEMENTS } from "../constants/app/nl_interface_constants";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { StatVarSpec } from "../shared/types";
import { urlToDomain } from "../shared/util";
import { isNlInterface } from "./nl_interface_utils";

export interface ReplacementStrings {
  place: string;
  date: string;
  statVar?: string;
}

/**
 * Formats a string with replacement strings.
 * @param s The string to format
 * @param rs The replacement strings to use
 */
export function formatString(s: string, rs: ReplacementStrings): string {
  let formattedString = s;
  for (const key in rs) {
    const re = new RegExp(`\\$\\{${key}\\}`, "g");
    formattedString = formattedString.replace(re, rs[key]);
  }
  return formattedString;
}

/**
 * Gets the stat var name to display
 * @param statVarDcid dcid of the stat var to get the name for
 * @param statVarSpecs list of available stat var specs
 * @param isPerCapita whether or not the name is for a per capita stat var
 */
export function getStatVarName(
  statVarDcid: string,
  statVarSpecs: StatVarSpec[],
  isPerCapita?: boolean
): string {
  for (const svs of statVarSpecs) {
    if (svs.statVar === statVarDcid) {
      if (svs.name) {
        return svs.name;
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

/**
 * Gets the JSX element for displaying a list of sources.
 * @param sources sources to include in the element
 */
export function getSourcesJsx(sources: Set<string>): JSX.Element[] {
  if (!sources) {
    return null;
  }

  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    // HACK for updating source for NL interface
    let processedSource = source;
    if (isNlInterface()) {
      processedSource = NL_SOURCE_REPLACEMENTS[source] || source;
    }
    const domain = urlToDomain(processedSource);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={processedSource}>
        {index > 0 ? ", " : ""}
        <a href={processedSource}>{domain}</a>
      </span>
    );
  });
  return sourcesJsx;
}

/**
 * Gets the unit given the unit for the stat var and the dcid of the denominator
 * TODO(chejennifer): clean up all the getUnit functions in this repo
 * @param statUnit the unit for the stat var
 * @param denomDcid the dcid of the denominator
 */
export function getUnitString(statUnit: string, denomDcid?: string): string {
  // TODO: Improve this to be denomDcid based.
  return statUnit;
}
