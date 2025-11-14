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
  popValue?: number;
  popDate?: string;
  unit?: string;
}

/**
 * For a place and axis, get the chart data for that place and axis
 */
function getPlaceAxisChartData(
  placePointStat: EntityObservation,
  denomsByFacet: Record<string, SeriesApiResponse>,
  defaultDenomData: SeriesApiResponse,
  placeDcid: string,
  metadataMap: Record<string, StatMetadata>,
  popBounds?: [number, number],
  denom?: string,
  scaling?: number
): PlaceAxisChartData {
  const obs = placePointStat[placeDcid];
  if (_.isEmpty(obs)) {
    return null;
  }
  console.log("obs in y axis:", obs);
  // finding the denom data that matches the facet of the current observation
  const populationData = denomsByFacet?.[obs.facet]
    ? denomsByFacet[obs.facet]
    : defaultDenomData;
  if (!denomsByFacet?.[obs.facet]) {
    console.log("using default denom data");
  }

  console.log("populationData in y axis:", populationData);
  const denomSeries =
    denom && populationData.data[denom] && populationData.data[denom][placeDcid]
      ? populationData.data[denom][placeDcid]
      : null;
  console.log(
    "denomSeries in y axis:",
    denom,
    populationData.data[denom],
    populationData.data[denom][placeDcid],
    denomSeries
  );

  if (denom && (_.isEmpty(denomSeries) || _.isEmpty(denomSeries.series))) {
    console.log("Returning null denom series");
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
    console.log("new value: ", value);
  }
  if (scaling) {
    value *= scaling;
  }
  let popValue = denomValue;
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
        console.log(
          `Population ${popObs?.value} for ${placeDcid} out of bounds`
        );
        return null;
      }
      // If this axis is using a population denominator, use that for the population value as well
      // Otherwise, use the default "Count_Person" variable.
      popValue = popValue || popObs.value;
      popDate = popDate || popObs.date;
    } else {
      console.log(`No population data for ${placeDcid}`);
    }
  }
  console.log("getting unit");
  const unit = getUnit(metadataMap[metaHash]);
  console.log("value in y axis:", value, popValue);
  return { value, statDate, sources, popValue, popDate, unit };
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
 * @param denomsByFacet map of facetId to denominator series result
 * @param defaultDenomData default denominator series result, queried without specifying facet
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
  denomsByFacet: Record<string, SeriesApiResponse>,
  defaultDenomData: SeriesApiResponse,
  metadataMap: Record<string, StatMetadata>,
  xDenom?: string,
  yDenom?: string,
  popBounds?: [number, number],
  xScaling?: number,
  yScaling?: number
): PlaceScatterData {
  const xChartData = getPlaceAxisChartData(
    xStatVarData,
    denomsByFacet,
    defaultDenomData,
    namedPlace.dcid,
    metadataMap,
    popBounds,
    xDenom,
    xScaling
  );
  console.log("xChartData:", xChartData);
  const yChartData = getPlaceAxisChartData(
    yStatVarData,
    denomsByFacet,
    defaultDenomData,
    namedPlace.dcid,
    metadataMap,
    popBounds,
    yDenom,
    yScaling
  );
  console.log("yChartData:", yChartData);
  if (_.isEmpty(yChartData)) {
    return null;
  }
  const xVal = _.isEmpty(xChartData) ? null : xChartData.value;
  const point = {
    place: namedPlace,
    xVal,
    yVal: yChartData.value,
    xDate: _.isEmpty(xChartData) ? null : xChartData.statDate,
    yDate: yChartData.statDate,
    xPopVal: _.isEmpty(xChartData) ? null : xChartData.popValue,
    yPopVal: yChartData.popValue,
    xPopDate: _.isEmpty(xChartData) ? null : xChartData.popDate,
    yPopDate: yChartData.popDate,
  };
  const sources = _.isEmpty(xChartData)
    ? yChartData.sources
    : xChartData.sources.concat(yChartData.sources);
  return {
    point,
    sources,
    xUnit: _.isEmpty(xChartData) ? "" : xChartData.unit,
    yUnit: yChartData.unit,
  };
}
