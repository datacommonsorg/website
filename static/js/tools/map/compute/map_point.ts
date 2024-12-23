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

// Custom hook to compute the display value for points on the map.

import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { DataPointMetadata } from "../../../shared/types";
import { ChartDataType, ChartStore, ChartStoreAction } from "../chart_store";
import { Context } from "../context";
import { useMapPointStatReady } from "../ready_hooks";
import { getPlaceChartData } from "../util";

export function useComputeMapPointValues(
  chartStore: ChartStore,
  dispatchChartStore: Dispatch<ChartStoreAction>,
  dispatchSources: Dispatch<Set<string>>,
  dispatchMetadata: Dispatch<Record<string, DataPointMetadata>>
): void {
  const { statVar, placeInfo, dateCtx } = useContext(Context);
  const mapPointStatReady = useMapPointStatReady(chartStore);
  useEffect(() => {
    if (!mapPointStatReady()) {
      return;
    }
    if (
      chartStore.mapPointStat.context &&
      dateCtx.value === chartStore.mapPointStat.context.date &&
      _.isEqual(statVar.value, chartStore.mapPointStat.context.statVar) &&
      _.isEqual(placeInfo.value, chartStore.mapPointStat.context.placeInfo)
    ) {
      return;
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
    dispatchChartStore({
      type: ChartDataType.MAP_POINT_VALUES,
      context: {
        date: dateCtx.value,
        statVar: _.cloneDeep(statVar.value),
        placeInfo: _.cloneDeep(placeInfo.value),
      },
      payload: mapPointValues,
    });
    dispatchSources(sources);
    dispatchMetadata(metadata);
  }, [
    dateCtx.value,
    statVar.value,
    placeInfo.value,
    chartStore.mapPointStat,
    mapPointStatReady,
    dispatchSources,
    dispatchMetadata,
    dispatchChartStore,
  ]);
}
