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

import React from "react";

import { StatVarInfo } from "../shared/stat_var";
import { ChartRegion } from "../tools/timeline/chart_region";

export interface StatVarsPropType {
  // Map from place dcid to place name.
  placeName: Record<string, string>;
  // Map from stat var dcid to info.
  statVarInfo: { [key: string]: StatVarInfo };
  // Order in which stat vars were selected.
  statVarOrder: string[];
}

function getURL(places: string[], statsVar: string): string {
  const params = new URLSearchParams({
    statsVar,
    place: places.join(","),
  }).toString();
  return `/tools/timeline#${params}`;
}

export function StatVars({
  placeName,
  statVarInfo,
  statVarOrder,
}: StatVarsPropType): JSX.Element {
  if (!statVarOrder.length) {
    return <section className="block col-12">No results found.</section>;
  }
  const places = Object.keys(placeName);
  return (
    <section className="block col-12">
      <div id="chart-region">
        <ChartRegion
          placeName={placeName}
          statVarInfo={statVarInfo}
          statVarOrder={statVarOrder}
        ></ChartRegion>
      </div>
      <ul>
        {statVarOrder.map((sv) => (
          <li key={sv}>
            <a href={getURL(places, sv)}>{statVarInfo[sv].title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
