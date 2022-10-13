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
import { useDefaultStatReady, useGeoJsonReady } from "./ready_hook";
import { getGeoJsonDataFeatures, MANUAL_GEOJSON_DISTANCES } from "./util";

// Custom hook to check if needs to compute ratio for the stat.
export function useIfRatio() {
  const { statVar } = useContext(Context);
  return useMemo(() => {
    console.log("run useIfRatio");
    return !!statVar.value.perCapita && !!statVar.value.denom;
  }, [statVar.value.perCapita, statVar.value.denom]);
}

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
