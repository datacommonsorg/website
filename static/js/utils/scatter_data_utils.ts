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
import {
  EntityObservation,
  SeriesApiResponse,
  StatMetadata,
} from "../shared/stat_types";
import { NamedPlace } from "../shared/types";
import { getMatchingObservation } from "../tools/shared_util";
import { isBetween } from "./number_utils";
import { getUnit } from "./stat_metadata_utils";

interface PlaceAxisChartData {
  value: number;
  statDate: string;
  sources: string[];
  pop?: number;
  popDate?: string;
  unit?: string;
}

/**
 * For a place and axis, get the chart data for that place and axis
 */
function getPlaceAxisChartData(
  placePointStat: EntityObservation,
  populationData: SeriesApiResponse,
  placeDcid: string,
  metadataMap: Record<string, StatMetadata>,
  popBounds?: [number, number],
  denom?: string,
  scaling?: number
): PlaceAxisChartData {
  const obs = placePointStat[placeDcid];
  const denomSeries =
    denom && populationData.data[denom] && populationData.data[denom][placeDcid]
      ? populationData.data[denom][placeDcid]
      : null;
  if (_.isEmpty(obs)) {
    return null;
  }
  if (denom && (_.isEmpty(denomSeries) || _.isEmpty(denomSeries.series))) {
    return null;
  }
  const sources = [];
  const statDate = obs.date;
  const metaHash = obs.facet;
  if (metaHash && metaHash in metadataMap) {
    sources.push(metadataMap[metaHash].provenanceUrl);
  }
  let value = obs.value || 0;
  let denomValue = null;
  let denomDate = null;
  if (!_.isEmpty(denomSeries)) {
    const denomObs = getMatchingObservation(denomSeries.series, obs.date);
    denomValue = denomObs.value;
    denomDate = denomObs.date;
    value /= denomValue;
  }
  if (scaling) {
    value *= scaling;
  }
  let pop = denomValue;
  let popDate = denomDate;
  if (!_.isNull(populationData)) {
    const popSeries = populationData.data[DEFAULT_POPULATION_DCID]
      ? populationData.data[DEFAULT_POPULATION_DCID][placeDcid]
      : null;
    if (popSeries && popSeries.series) {
      const popObs = getMatchingObservation(popSeries.series, obs.date);
      if (
        popBounds &&
        (!popObs || !isBetween(popObs.value, popBounds[0], popBounds[1]))
      ) {
        return null;
      }
      // If this axis is using a population denominator, use that for the population value as well
      // Otherwise, use the default "Count_Person" variable.
      pop = pop || popObs.value;
      popDate = pop || popObs.date;
    } else {
      console.log(`No population data for ${placeDcid}`);
    }
  }
  const unit = getUnit(metadataMap[metaHash]);
  return { value, statDate, sources, pop, popDate, unit };
}

interface PlaceScatterData {
  point: Point;
  sources: string[];
  xUnit?: string;
  yUnit?: string;
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
  xStatVarData: EntityObservation,
  yStatVarData: EntityObservation,
  populationData: SeriesApiResponse,
  metadataMap: Record<string, StatMetadata>,
  xDenom?: string,
  yDenom?: string,
  popBounds?: [number, number],
  xScaling?: number,
  yScaling?: number
): PlaceScatterData {
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
    xPop: xChartData.pop,
    yPop: yChartData.pop,
    xPopDate: xChartData.popDate,
    yPopDate: yChartData.popDate,
  };
  const sources = xChartData.sources.concat(yChartData.sources);
  return { point, sources, xUnit: xChartData.unit, yUnit: yChartData.unit };
}
