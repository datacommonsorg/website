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

// Custom hook to compute the values and used dates for the main map chart.

import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import {
  EntityObservation,
  EntityObservationList,
} from "../../../shared/stat_types";
import { DataPointMetadata } from "../../../shared/types";
import { ChartDataType, ChartStore, ChartStoreAction } from "../chart_store";
import { useIfRatio } from "../condition_hooks";
import { Context } from "../context";
import {
  useAllStatReady,
  useDefaultStatReady,
  useDenomStatReady,
  useMapValuesDatesReady,
} from "../ready_hooks";
import { getPlaceChartData } from "../util";

export function useComputeMapValueAndDate(
  chartStore: ChartStore,
  dispatchChartStore: Dispatch<ChartStoreAction>,
  dispatchSources: Dispatch<Set<string>>,
  dispatchMetadata: Dispatch<Record<string, DataPointMetadata>>
): void {
  const { statVar, placeInfo, dateCtx } = useContext(Context);
  const allStatReady = useAllStatReady(chartStore);
  const defaultStatReady = useDefaultStatReady(chartStore);
  const denomStatReady = useDenomStatReady(chartStore);
  const mapValuesDatesReady = useMapValuesDatesReady(chartStore);
  const ifRatio = useIfRatio();
  useEffect(() => {
    if (statVar.value.metahash && !allStatReady()) {
      return;
    }
    if (!statVar.value.metahash && !defaultStatReady()) {
      return;
    }
    if (mapValuesDatesReady(true /* checkDate */)) {
      return;
    }
    if (ifRatio && !denomStatReady()) {
      return;
    }
    console.log("[Map Compute] map values and dates");
    const mapValues = {};
    const sources = new Set<string>();
    const mapDates = new Set<string>();
    const metadata = {};
    const facets = Object.assign(
      {},
      chartStore.defaultStat.data ? chartStore.defaultStat.data.facets : {},
      chartStore.denomStat.data ? chartStore.denomStat.data.facets : {},
      chartStore.allStat.data ? chartStore.allStat.data.facets : {}
    );
    let wantedFacetData: EntityObservation;
    if (chartStore.defaultStat.data) {
      wantedFacetData = chartStore.defaultStat.data.data;
    }
    if (statVar.value.metahash) {
      wantedFacetData = filterAllFacetData(
        chartStore.allStat.data.data,
        statVar.value.metahash
      );
    }
    if (_.isEmpty(wantedFacetData)) {
      return;
    }
    let unit = "";
    for (const placeDcid in wantedFacetData) {
      const placeChartData = getPlaceChartData(
        wantedFacetData,
        placeDcid,
        ifRatio,
        chartStore.denomStat.data ? chartStore.denomStat.data.data : {},
        facets
      );
      if (_.isEmpty(placeChartData)) {
        continue;
      }
      mapValues[placeDcid] = placeChartData.value;
      mapDates.add(placeChartData.date);
      if (!_.isEmpty(placeChartData.metadata)) {
        metadata[placeDcid] = placeChartData.metadata;
      }
      placeChartData.sources.forEach((source) => {
        if (!_.isEmpty(source)) {
          sources.add(source);
        }
      });
      unit = unit || placeChartData.unit;
    }
    dispatchSources(sources);
    dispatchMetadata(metadata);
    dispatchChartStore({
      type: ChartDataType.MAP_VALUES_DATES,
      context: {
        date: dateCtx.value,
        statVar: _.cloneDeep(statVar.value),
        placeInfo: _.cloneDeep(placeInfo.value),
      },
      payload: { mapValues, mapDates, unit },
    });
  }, [
    dateCtx.value,
    statVar.value,
    placeInfo.value,
    chartStore.mapValuesDates,
    chartStore.allStat,
    chartStore.defaultStat,
    chartStore.denomStat,
    ifRatio,
    allStatReady,
    defaultStatReady,
    mapValuesDatesReady,
    denomStatReady,
    dispatchSources,
    dispatchMetadata,
    dispatchChartStore,
  ]);
}

function filterAllFacetData(
  data: EntityObservationList,
  targetFacet: string
): EntityObservation {
  const result = {};
  for (const place in data) {
    for (const obs of data[place]) {
      if (obs.facet == targetFacet) {
        result[place] = obs;
        break;
      }
    }
  }
  return result;
}
