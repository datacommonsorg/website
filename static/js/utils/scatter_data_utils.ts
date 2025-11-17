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
import { getDenomInfo } from "./tile_utils";

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
  const denomInfo = getDenomInfo(
    denom,
    denomsByFacet,
    placeDcid,
    obs.date,
    obs.facet,
    defaultDenomData
  );
  const sources = [];
  const statDate = obs.date;
  const metaHash = obs.facet;
  if (metaHash && metaHash in metadataMap) {
    sources.push(metadataMap[metaHash].provenanceUrl);
  }
  let value = obs.value || 0;
  let denomValue = null;
  let denomDate = null;
  if (!_.isEmpty(denomInfo?.series)) {
    if (!denomInfo || !denomInfo.value) {
      return null;
    }
    denomValue = denomInfo.value;
    denomDate = denomInfo.date;
    value /= denomValue;
  }
  if (scaling) {
    value *= scaling;
  }
  let popValue = denomValue;
  let popDate = denomDate;
  // checking if there is any denominator data submitted
  if (!_.isNull(denomsByFacet) && !_.isNull(defaultDenomData)) {
    const popInfo = getDenomInfo(
      DEFAULT_POPULATION_DCID,
      denomsByFacet,
      placeDcid,
      obs.date,
      obs.facet,
      defaultDenomData
    );
    if (popInfo.series) {
      if (
        popBounds &&
        (!popInfo || !isBetween(popInfo.value, popBounds[0], popBounds[1]))
      ) {
        return null;
      }
      // If this axis is using a population denominator, use that for the population value as well
      // Otherwise, use the default "Count_Person" variable.
      popValue = denomValue || popInfo.value;
      popDate = denomDate || popInfo.date;
    } else {
      console.log(`No population data for ${placeDcid}`);
    }
  }
  const unit = getUnit(metadataMap[metaHash]);
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
  if (_.isEmpty(xChartData)) {
    return null;
  }
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
  if (_.isEmpty(yChartData)) {
    return null;
  }
  const point = {
    place: namedPlace,
    xVal: xChartData.value,
    yVal: yChartData.value,
    xDate: xChartData.statDate,
    yDate: yChartData.statDate,
    xPopVal: xChartData.popValue,
    yPopVal: yChartData.popValue,
    xPopDate: xChartData.popDate,
    yPopDate: yChartData.popDate,
  };
  const sources = xChartData.sources.concat(yChartData.sources);
  return { point, sources, xUnit: xChartData.unit, yUnit: yChartData.unit };
}
