/**
 * Copyright 2021 Google LLC
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
import * as d3 from "d3";
import _ from "lodash";

import { TimeSeries } from "../shared/stat_types";
import { StatVarInfo } from "../shared/stat_var";

/**
 * Functions and interfaces shared between tools components
 */

interface PlacePointStatMetadata {
  provenanceUrl: string;
  measurementMethod: string;
  unit?: string;
}

export interface PlacePointStatData {
  date: string;
  value: number;
  metadata: { importName: string };
}
export interface PlacePointStat {
  metadata: { [importName: string]: PlacePointStatMetadata };
  stat: { [dcid: string]: PlacePointStatData };
}

export interface SourceSeries {
  data: { [date: string]: number };
  placeName: string;
  provenanceUrl: string;
}

/**
 * Helper function to choose the date to use for population data.
 * @param popData
 * @param statData
 */
export function getPopulationDate(
  popData: TimeSeries,
  statData: PlacePointStatData
): string {
  const xPopDataDates = Object.keys(popData.val);
  let popDate = xPopDataDates.find((date) => date === statData.date);
  if (!popDate && !_.isEmpty(xPopDataDates)) {
    // Filter for all population dates encompassed by the stat var date.
    // ie. if stat var date is year, filter for all population dates with
    // the same year
    const encompassedPopDates = xPopDataDates.filter((date) => {
      return date.includes(statData.date);
    });
    if (encompassedPopDates.length > 0) {
      // when there are multiple population dates encompassed by the stat var
      // date, choose the latest date
      popDate = encompassedPopDates[encompassedPopDates.length - 1];
    } else {
      // From ordered list of population dates, choose the date immediately
      // before the stat var date (if there is a date that encompasses the stat
      // var date, this will get chosen). If none, return the first pop date.
      const idx = d3.bisect(xPopDataDates, statData.date);
      popDate = idx > 0 ? xPopDataDates[idx - 1] : xPopDataDates[0];
    }
  }
  return popDate;
}

/**
 * Helper function to get units given a PlacePointStat
 * @param placePointStat
 */
export function getUnit(placePointStat: PlacePointStat): string {
  const metadata = placePointStat.metadata;
  if (_.isEmpty(metadata)) {
    return "";
  }
  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.length > 0) {
    return metadata[metadataKeys[0]].unit;
  } else {
    return "";
  }
}
