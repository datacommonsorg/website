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

// Custom hook to compute legend domain for time slider.

import _ from "lodash";
import { useContext, useMemo } from "react";

import { getMatchingObservation } from "../../shared_util";
import { ChartStore } from "../chart_store";
import { useIfRatio } from "../condition_hooks";
import { Context } from "../context";
import {
  useDefaultStatReady,
  useDenomStatReady,
  useStatVarSummaryReady,
} from "../ready_hooks";
import { getMetahashMap, getMetaText } from "../util";

const PADDING_SCALE_SMALL = 0.9;
const PADDING_SCALE_LARGE = 1.1;

export function useComputeLegendDomain(
  chartStore: ChartStore,
  sampleFacet: string
): [number, number, number] {
  const { display, placeInfo } = useContext(Context);
  const denomStatReady = useDenomStatReady(chartStore);
  const defaultStatReady = useDefaultStatReady(chartStore);
  const statVarSummaryReady = useStatVarSummaryReady(chartStore);
  const ifRatio = useIfRatio();
  return useMemo(() => {
    // Only set domain for if time slider is shown.
    if (!display.value.showTimeSlider) {
      return null;
    }
    // * Set legend bounds when per capita is selected. This will use an estimate based on
    // * Best Available instead of the min/max from the StatVarSummary.
    if (ifRatio && defaultStatReady() && denomStatReady()) {
      let minValue: number = Number.MAX_SAFE_INTEGER;
      let maxValue = 0;
      const denomStat = chartStore.denomStat.data.data;
      const defaultStat = chartStore.defaultStat.data.data;
      for (const place in defaultStat) {
        let value = defaultStat[place].value;
        const date = defaultStat[place].date;
        if (!value) {
          continue;
        }
        if (_.isEmpty(denomStat || _.isEmpty(denomStat[place].series))) {
          continue;
        }
        const pop = getMatchingObservation(denomStat[place].series, date);
        if (!pop || pop.value === 0) {
          continue;
        }
        value /= pop.value;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
      // Using Best Available data as estimate - give some padding for other dates
      minValue =
        minValue > 0
          ? minValue * PADDING_SCALE_SMALL
          : minValue * PADDING_SCALE_LARGE;
      maxValue =
        maxValue > 0
          ? maxValue * PADDING_SCALE_LARGE
          : maxValue * PADDING_SCALE_SMALL;
      return [minValue, (minValue + maxValue) / 2, maxValue];
    }
    if (_.isNull(sampleFacet)) {
      return null;
    }
    if (!statVarSummaryReady()) {
      return null;
    }
    const metahashMap: Record<string, string> = getMetahashMap(
      chartStore.allDates.data.facets
    );

    const provenanceSummary = chartStore.statVarSummary.data.provenanceSummary;
    const placeType = placeInfo.value.enclosedPlaceType;
    for (const provId in provenanceSummary) {
      const provenance = provenanceSummary[provId];
      for (const series of provenance.seriesSummary) {
        if (!(placeType in series.placeTypeSummary)) {
          continue;
        }
        const metatext = getMetaText({
          ...series.seriesKey,
          importName: provenance.importName,
        });
        if (!(metatext in metahashMap)) {
          continue;
        }
        if (metahashMap[metatext] !== sampleFacet) {
          continue;
        }
        const minValue = series.placeTypeSummary[placeType].minValue || 0;
        const maxValue = series.placeTypeSummary[placeType].maxValue;
        return [minValue, (minValue + maxValue) / 2, maxValue];
      }
    }
    return null;
  }, [
    placeInfo.value.enclosedPlaceType,
    display.value.showTimeSlider,
    sampleFacet,
    chartStore.statVarSummary.data,
    chartStore.denomStat.data,
    chartStore.defaultStat.data,
    chartStore.allDates.data,
    ifRatio,
    denomStatReady,
    defaultStatReady,
    statVarSummaryReady,
  ]);
}
