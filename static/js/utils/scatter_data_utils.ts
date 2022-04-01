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

import _ from "lodash";

import { Point } from "../chart/draw_scatter";
import { DEFAULT_POPULATION_DCID } from "../shared/constants";
import { StatApiResponse } from "../shared/stat_types";
import { NamedPlace } from "../shared/types";
import {
  getPopulationDate,
  PlacePointStat,
  StatMetadata,
} from "../tools/shared_util";
import { isBetween } from "./number_utils";

interface PlaceAxisChartData {
  value: number;
  statDate: string;
  sources: string[];
  denomValue?: number;
  denomDate?: string;
}

/**
 * For a place and axis, get the chart data for that place and axis
 */
function getPlaceAxisChartData(
  placePointStat: PlacePointStat,
  populationData: StatApiResponse,
  placeDcid: string,
  metadataMap: Record<string, StatMetadata>,
  popBounds?: [number, number],
  denom?: string,
  scaling?: number
): PlaceAxisChartData {
  const placePointStatData = placePointStat.stat[placeDcid];
  const popSeries = populationData[placeDcid]
    ? populationData[placeDcid].data[DEFAULT_POPULATION_DCID]
    : null;
  const denomSeries =
    denom && populationData[placeDcid]
      ? populationData[placeDcid].data[denom]
      : null;
  if (_.isEmpty(placePointStatData)) {
    return null;
  }
  if (denom && (_.isEmpty(denomSeries) || _.isEmpty(denomSeries.val))) {
    return null;
  }
  const sources = [];
  const statDate = placePointStatData.date;
  const metaHash = placePointStat.metaHash || placePointStatData.metaHash;
  if (metaHash && metaHash in metadataMap) {
    sources.push(metadataMap[metaHash].provenanceUrl);
  }
  let value =
    placePointStatData.value === undefined ? 0 : placePointStatData.value;
  let denomDate = null;
  let denomValue = null;
  if (!_.isEmpty(denomSeries)) {
    denomDate = getPopulationDate(denomSeries, placePointStatData);
    denomValue = denomSeries.val[denomDate];
    value /= denomValue;
  }
  if (scaling) {
    value *= scaling;
  }
  if (popBounds) {
    if (popSeries && popSeries.val) {
      const popDate = getPopulationDate(popSeries, placePointStatData);
      const popValue = popSeries.val[popDate];
      if (!isBetween(popValue, popBounds[0], popBounds[1])) {
        return null;
      }
    } else {
      console.log(`No population data for ${placeDcid}`);
    }
  }
  return { value, statDate, sources, denomDate, denomValue };
}

/**
 * Get the scatter chart data for a place
 * @param namedPlace place to get chart data for
 * @param xStatVarData data for the x axis stat var
 * @param yStatVarData data for the y axis stat var
 * @param populationData data for the population stat vars
 * @param metadataMap map of metahash to metadata for stat var data
 * @param xDenom optional denominator to use for x axis value calculation
 * @param yDenom optional denominator to use for y axis value calculation
 * @param popBounds optional range for population of accepted points
 * @param scaling optional amount to scale the value by
 * @returns
 */
export function getPlaceScatterData(
  namedPlace: NamedPlace,
  xStatVarData: PlacePointStat,
  yStatVarData: PlacePointStat,
  populationData: StatApiResponse,
  metadataMap: Record<string, StatMetadata>,
  xDenom?: string,
  yDenom?: string,
  popBounds?: [number, number],
  xScaling?: number,
  yScaling?: number
): { point: Point; sources: string[] } {
  const xChartData = getPlaceAxisChartData(
    xStatVarData,
    populationData,
    namedPlace.dcid,
    metadataMap,
    popBounds,
    xDenom,
    xScaling
  );
  if (_.isEmpty(xChartData)) {
    return null;
  }
  const yChartData = getPlaceAxisChartData(
    yStatVarData,
    populationData,
    namedPlace.dcid,
    metadataMap,
    popBounds,
    yDenom,
    yScaling
  );
  if (_.isEmpty(yChartData)) {
    return null;
  }
  const point = {
    place: namedPlace,
    xVal: xChartData.value,
    yVal: yChartData.value,
    xDate: xChartData.statDate,
    yDate: yChartData.statDate,
    xPop: xChartData.denomValue,
    yPop: yChartData.denomValue,
    xPopDate: xChartData.denomDate,
    yPopDate: yChartData.denomDate,
  };
  const sources = xChartData.sources.concat(yChartData.sources);
  return { point, sources };
}
