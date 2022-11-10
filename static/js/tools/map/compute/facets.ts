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

// Custom hook to compute the list of facets to show in source selector.

import { useContext, useMemo } from "react";

import { FacetSelectorFacetInfo } from "../../../shared/facet_selector";
import { StatMetadata } from "../../../shared/stat_types";
import { ChartStore } from "../chart_store";
import { Context } from "../context";
import { useAllStatReady } from "../ready_hooks";

export function useComputeFacetList(
  chartStore: ChartStore
): FacetSelectorFacetInfo[] {
  const { statVar } = useContext(Context);
  const allStatReady = useAllStatReady(chartStore);
  return useMemo(() => {
    if (!statVar.value.info || !allStatReady()) {
      return null;
    }
    const filteredMetadataMap: Record<string, StatMetadata> = {};
    const facets = chartStore.allStat.data.facets;
    const data = chartStore.allStat.data.data;
    for (const place in data) {
      for (const obs of data[place]) {
        if (obs.facet in facets) {
          filteredMetadataMap[obs.facet] = facets[obs.facet];
        }
      }
    }
    return [
      {
        dcid: statVar.value.dcid,
        metadataMap: filteredMetadataMap,
        name:
          statVar.value.dcid in statVar.value.info
            ? statVar.value.info[statVar.value.dcid].title
            : statVar.value.dcid,
      },
    ];
  }, [
    statVar.value.dcid,
    statVar.value.info,
    chartStore.allStat.data,
    allStatReady,
  ]);
}
