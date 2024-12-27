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

// Custom hook to compute the displayed value for breadcrumb places.

import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { ChartDataType, ChartStore, ChartStoreAction } from "../chart_store";
import { useIfRatio } from "../condition_hooks";
import { Context } from "../context";
import {
  useBreadcrumbDenomStatReady,
  useBreadcrumbStatReady,
  useBreadcrumbValuesReady,
} from "../ready_hooks";
import { getPlaceChartData } from "../util";

export function useComputeBreadcrumbValues(
  chartStore: ChartStore,
  dispatchChartStore: Dispatch<ChartStoreAction>
): void {
  const { dateCtx, statVar, placeInfo } = useContext(Context);
  const breadcrumbStatReady = useBreadcrumbStatReady(chartStore);
  const breadcrumbDenomStatReady = useBreadcrumbDenomStatReady(chartStore);
  const breadcrumbValuesReady = useBreadcrumbValuesReady(chartStore);
  const ifRatio = useIfRatio();
  useEffect(() => {
    if (!breadcrumbStatReady()) {
      return;
    }
    if (ifRatio && !breadcrumbDenomStatReady()) {
      return;
    }
    if (breadcrumbValuesReady(true /* checkDate */)) {
      return;
    }
    console.log("[Map Compute] breadcrumb values");
    const breadcrumbValues = {};
    const facets = Object.assign(
      {},
      chartStore.breadcrumbStat.data.facets,
      chartStore.breadcrumbDenomStat.data
        ? chartStore.breadcrumbDenomStat.data.facets
        : {}
    );
    for (const place in chartStore.breadcrumbStat.data.data) {
      const placeChartData = getPlaceChartData(
        chartStore.breadcrumbStat.data.data,
        place,
        ifRatio,
        chartStore.breadcrumbDenomStat.data
          ? chartStore.breadcrumbDenomStat.data.data
          : null,
        facets
      );
      if (_.isEmpty(placeChartData)) {
        continue;
      }
      breadcrumbValues[place] = placeChartData.value;
    }
    dispatchChartStore({
      type: ChartDataType.BREADCRUMB_VALUES,
      context: {
        date: dateCtx.value,
        statVar: _.cloneDeep(statVar.value),
        placeInfo: _.cloneDeep(placeInfo.value),
      },
      payload: breadcrumbValues,
    });
  }, [
    dateCtx.value,
    statVar.value,
    placeInfo.value,
    chartStore.breadcrumbStat.data,
    chartStore.breadcrumbDenomStat.data,
    chartStore.breadcrumbValues,
    ifRatio,
    breadcrumbStatReady,
    breadcrumbDenomStatReady,
    breadcrumbValuesReady,
    dispatchChartStore,
  ]);
}
