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
import { Dispatch, useContext, useEffect } from "react";

import {
  EntityObservation,
  EntityObservationList,
} from "../../../shared/stat_types";
import { ChartDataType, ChartStore, ChartStoreAction } from "../chart_store";
import { useIfRatio } from "../condition_hooks";
import { Context } from "../context";
import {
  useAllStatReady,
  useDefaultStatReady,
  useDenomStatReady,
  useGeoJsonReady,
} from "../ready_hooks";
import { DataPointMetadata, getPlaceChartData } from "../util";

export function useComputeMapValueAndDate(
  chartStore: ChartStore,
  dispatchChartStore: Dispatch<ChartStoreAction>,
  dispatchSources: Dispatch<Set<string>>,
  dispatchMetadata: Dispatch<Record<string, DataPointMetadata>>
) {
  const { statVar, placeInfo } = useContext(Context);
  const geoJsonReady = useGeoJsonReady(chartStore);
  const allStatReady = useAllStatReady(chartStore);
  const defaultStatReady = useDefaultStatReady(chartStore);
  const denomStatReady = useDenomStatReady(chartStore);
  const ifRatio = useIfRatio();
  return useEffect(() => {
    if (!geoJsonReady()) {
      return;
    }
    if (statVar.value.metahash) {
      if (!allStatReady()) {
        return;
      }
    } else {
      if (!defaultStatReady()) {
        return;
      }
    }
    if (
      chartStore.mapValuesDates.context &&
      _.isEqual(statVar.value, chartStore.mapValuesDates.context.statVar) &&
      _.isEqual(placeInfo.value, chartStore.mapValuesDates.context.placeInfo)
    ) {
      return;
    }
    if (ifRatio && !denomStatReady()) {
      return;
    }
    console.log(`compute map values and dates for ${statVar.value.date}`);
    const mapValues = {};
    const sources = new Set<string>();
    const mapDates = new Set<string>();
    const metadata = {};
    const facets = Object.assign(
      [],
      chartStore.defaultStat.data.facets,
      chartStore.denomStat.data ? chartStore.denomStat.data.facets : {},
      chartStore.allStat.data ? chartStore.allStat.data.facets : {}
    );
    for (const geoFeature of chartStore.geoJson.data.features) {
      const placeDcid = geoFeature.properties.geoDcid;
      let wantedFacetData = chartStore.defaultStat.data.data;
      if (statVar.value.metahash) {
        wantedFacetData = filterAllFacetData(
          chartStore.allStat.data.data,
          statVar.value.metahash
        );
        if (_.isEmpty(wantedFacetData)) {
          continue;
        }
      }
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
    }
    dispatchSources(sources);
    dispatchMetadata(metadata);
    dispatchChartStore({
      type: ChartDataType.MAP_VALUES_DATES,
      context: {
        statVar: _.cloneDeep(statVar.value),
        placeInfo: _.cloneDeep(placeInfo.value),
      },
      payload: { mapValues, mapDates },
    });
  }, [
    statVar.value,
    placeInfo.value,
    chartStore.mapValuesDates,
    chartStore.allStat,
    chartStore.defaultStat,
    chartStore.denomStat,
    chartStore.geoJson.data,
    ifRatio,
    allStatReady,
    defaultStatReady,
    geoJsonReady,
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
