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

// This module contains custom React hooks that makes computation for map chart.

import _ from "lodash";
import { Dispatch, useMemo } from "react";

import { ChartStore } from "../chart_store";
import { useMapPointStatReady } from "../ready_hooks";
import { DataPointMetadata, getPlaceChartData } from "../util";

export function useComputeMapPointValues(
  chartStore: ChartStore,
  dispatchSources: Dispatch<Set<string>>,
  dispatchMetadata: Dispatch<Record<string, DataPointMetadata>>
): {
  [dcid: string]: number;
} {
  const mapPointStatReady = useMapPointStatReady(chartStore);
  return useMemo(() => {
    if (!mapPointStatReady()) {
      return null;
    }
    console.log("[Map Compute] map point values");
    const mapPointValues = {};
    const sources = new Set<string>();
    const metadata = {};
    for (const placeDcid in chartStore.mapPointStat.data.data) {
      const placeChartData = getPlaceChartData(
        chartStore.mapPointStat.data.data,
        placeDcid,
        false,
        {},
        chartStore.mapPointStat.data.facets
      );
      if (_.isNull(placeChartData)) {
        continue;
      }
      mapPointValues[placeDcid] = placeChartData.value;
      if (!_.isEmpty(placeChartData.metadata)) {
        metadata[placeDcid] = placeChartData.metadata;
      }
      placeChartData.sources.forEach((source) => {
        if (!_.isEmpty(source)) {
          sources.add(source);
        }
      });
    }
    dispatchSources(sources);
    dispatchMetadata(metadata);
    return mapPointValues;
  }, [
    chartStore.mapPointStat,
    mapPointStatReady,
    dispatchSources,
    dispatchMetadata,
  ]);
}
