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
 * Util functions used by timeline tool.
 */

import _ from "lodash";

import { StatVarInfo } from "../../shared/stat_var";

/**
 * Groups stat vars in groups that can be shown on one single timeline chart.
 * @param statVarOrder the order in which the stat vars were picked
 * @param statVarInfo a mapping of stat var dcid to its stat var info
 * @returns groups which is a mapping of group key to list of stat var dcids,
 *          and chartOrder which is a list of group keys in the order they
 *          should be shown
 */
export function getStatVarGroups(
  statVarOrder: string[],
  statVarInfo: {
    [key: string]: StatVarInfo;
  }
): { groups: { [key: string]: string[] }; chartOrder: string[] } {
  const groups = {};
  const chartOrder = [];
  for (const statVarId of statVarOrder) {
    if (!statVarInfo[statVarId]) {
      continue;
    }
    const mprop = statVarInfo[statVarId].mprop || "none";
    const md = statVarInfo[statVarId].md || "none";
    const key = `${mprop}-${md}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(statVarId);
    chartOrder.push(key);
  }
  // we want to show the charts in reverse order of when the stat vars were
  // picked. (ie. chart of last picked stat var should be shown first)
  if (!_.isEmpty(chartOrder)) {
    chartOrder.reverse();
  }
  const seenGroups = new Set();
  const filteredChartOrder = chartOrder.filter((group) => {
    const keep = !seenGroups.has(group);
    seenGroups.add(group);
    return keep;
  });

  return { groups, chartOrder: filteredChartOrder };
}
