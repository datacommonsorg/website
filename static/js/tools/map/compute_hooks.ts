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
import { Dispatch, useContext, useEffect, useMemo } from "react";

import { GeoJsonData } from "../../chart/types";
import { ChartDataType, ChartStore, ChartStoreAction } from "./chart_store";
import { Context } from "./context";
import {
  useAllDatesReady,
  useDefaultStatReady,
  useGeoJsonReady,
} from "./ready_hooks";
import {
  getGeoJsonDataFeatures,
  getTimeSliderDates,
  MANUAL_GEOJSON_DISTANCES,
} from "./util";

// For IPCC grid data, geoJson features is calculated based on the grid
// DCID.
export function useUpdateGeoJson(
  chartStore: ChartStore,
  dispatch: Dispatch<ChartStoreAction>
) {
  const { placeInfo } = useContext(Context);
  const geoJsonReady = useGeoJsonReady(chartStore);
  const defaultStatReady = useDefaultStatReady(chartStore);

  useEffect(() => {
    if (
      placeInfo.value.enclosedPlaceType in MANUAL_GEOJSON_DISTANCES &&
      geoJsonReady() &&
      defaultStatReady() &&
      _.isEmpty(chartStore.geoJson.data.features)
    ) {
      console.log("update geo json data features");
      const geoJsonFeatures = getGeoJsonDataFeatures(
        Object.keys(chartStore.defaultStat.data.data),
        placeInfo.value.enclosedPlaceType
      );
      dispatch({
        type: ChartDataType.GEO_JSON,
        error: null,
        payload: {
          type: "FeatureCollection",
          properties: { current_geo: placeInfo.value.enclosingPlace.dcid },
          features: geoJsonFeatures,
        } as GeoJsonData,
      });
    }
  }, [
    chartStore.geoJson,
    chartStore.defaultStat,
    placeInfo.value.enclosedPlaceType,
    placeInfo.value.enclosingPlace.dcid,
    geoJsonReady,
    defaultStatReady,
    dispatch,
  ]);
}

export function useComputeSampledDates(
  chartStore: ChartStore
): Record<string, Array<string>> {
  const allDatesReady = useAllDatesReady(chartStore);
  return useMemo(() => {
    if (!allDatesReady()) {
      return {};
    }
    const allSampledDates = getTimeSliderDates(
      chartStore.allDates.data.facets,
      chartStore.allDates.data.data
    );
    console.log(allSampledDates);
    return allSampledDates;
  }, [chartStore.allDates.data, allDatesReady]);
}
