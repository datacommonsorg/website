/**
 * Copyright 2020 Google LLC
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

import axios from "axios";
import _ from "lodash";

import { DataGroup, DataPoint } from "../../chart/base";
import {
  DisplayNameApiResponse,
  StatApiResponse,
  TimeSeries,
} from "../../shared/stat_types";
import { isDateTooFar } from "../../shared/util";

const TOTAL_POPULATION_SV = "Count_Person";
const ZERO_POPULATION = 0;

/**
 * Stats Data is keyed by statistical variable, then keyed by place dcid, with
 * value being the ApiResponse that contains multiple place time series.
 */
export interface StatData {
  places: string[];
  statVars: string[];
  dates: string[];
  data: StatApiResponse;
  sources: Set<string>;
  latestCommonDate: string;
}

/**
 * Group data by stats var with time.
 *
 * @param place? The place to get the stats.
 */
export function getStatVarGroupWithTime(
  statData: StatData,
  place?: string
): DataGroup[] {
  if (!place) {
    place = statData.places[0];
  }
  const result: DataGroup[] = [];
  for (const statVar of statData.statVars) {
    const dataPoints: DataPoint[] = [];
    if (!statData.data[place] || !statData.data[place].data[statVar]) {
      continue;
    }
    const timeSeries = statData.data[place].data[statVar];
    if (timeSeries.val && Object.keys(timeSeries.val).length !== 0) {
      for (const date of statData.dates) {
        if (isDateTooFar(date)) {
          continue;
        }
        dataPoints.push({
          label: date,
          time: new Date(date).getTime(),
          value: date in timeSeries.val ? timeSeries.val[date] : null,
        });
      }
      result.push(new DataGroup(statVar, dataPoints));
    }
  }
  return result;
}

/**
 * For each time series of the input stat data, compute the delta beteen
 * consecutive date and return the delta series.
 * @param statData
 */
export function convertToDelta(statData: StatData): StatData {
  const result = _.cloneDeep(statData);
  for (const place in result.data) {
    for (const statVar in result.data[place].data) {
      const dates = Object.keys(result.data[place].data[statVar].val);
      dates.sort();
      const vals = _.cloneDeep(result.data[place].data[statVar].val);
      if (dates.length > 1) {
        for (let i = 0; i < dates.length - 1; i++) {
          result.data[place].data[statVar].val[dates[i + 1]] =
            vals[dates[i + 1]] - vals[dates[i]];
        }
      }
      delete result.data[place].data[statVar].val[dates[0]];
      const index = result.dates.indexOf(dates[0]);
      if (index !== -1) {
        result.dates.splice(index, 1);
      }
    }
  }

  return result;
}

/**
 * Returns per capita computation applied to the time series
 *
 * @param statSeries Time series to apply per capita computation to.
 * @param popSeries Population series data to use for the per capita computation.
 *
 * @returns TimeSeries with the per capita calculation applied to its values.
 */
export function computePerCapita(
  statSeries: TimeSeries,
  popSeries: TimeSeries,
  scaling = 1
): TimeSeries {
  if (!popSeries.val) {
    return {};
  }
  const result = _.cloneDeep(statSeries);
  const popYears = Object.keys(popSeries.val);
  popYears.sort();
  const yearMin = popYears[0];
  const yearMax = popYears[popYears.length - 1];
  for (const date in statSeries.val) {
    const year = date.split("-")[0];
    let pop: number;
    if (year in popSeries.val) {
      pop = popSeries.val[year];
    } else if (year < yearMin) {
      pop = popSeries.val[yearMin];
    } else if (year > yearMax) {
      pop = popSeries.val[yearMax];
    } else {
      // Choose the population year that is the closest to stat year.
      let minDiff = parseInt(yearMax);
      for (const y of popYears) {
        const diff = Math.abs(parseInt(y) - parseInt(year));
        if (diff < minDiff) {
          minDiff = diff;
          pop = popSeries.val[y];
        }
      }
    }
    if (pop === ZERO_POPULATION) {
      result.val[date] = ZERO_POPULATION;
    } else {
      result.val[date] /= pop / scaling;
    }
  }
  return result;
}

/**
 * Fetch statistical time series given a set of places and a set of statistical
 * variables.
 *
 * @param places A list of place dcids.
 * @param statVars A list of statistical variable dcids.
 * @param perCapita Whether to compute per capita result.
 * @param scaling Scaling factor for per capita compuation.
 *
 * @returns A Promise of StatData object.
 */
export function fetchStatData(
  places: string[],
  statVars: string[],
  perCapita = false,
  delta = false,
  scaling = 1,
  denominators: Record<string, string> = {}
): Promise<StatData> {
  let denomStatVars = [];
  if (perCapita) {
    denomStatVars.push(TOTAL_POPULATION_SV);
    for (const sv in denominators) {
      denomStatVars.push(denominators[sv]);
    }
  }
  denomStatVars = Array.from(new Set(denomStatVars));

  const statDataPromise: Promise<StatApiResponse> = axios
    .post(`/api/stats`, {
      places: places,
      statVars: statVars,
    })
    .then((resp) => {
      return resp.data;
    });
  let denomDataPromise: Promise<StatApiResponse>;
  if (denomStatVars.length > 0) {
    denomDataPromise = axios
      .post(`/api/stats`, {
        places: places,
        statVars: denomStatVars,
      })
      .then((resp) => {
        return resp.data;
      });
  } else {
    denomDataPromise = Promise.resolve({});
  }

  let placeParams = `?`;
  for (const place of places) {
    placeParams += `&dcid=${place}`;
  }
  const displayNamesPromise: Promise<DisplayNameApiResponse> = axios
    .get(`/api/place/displayname${placeParams}`)
    .then((resp) => {
      return resp.data;
    });

  // create list of promises containing apiDataPromises followed by displayNamesPromise
  const apiPromises: Promise<StatApiResponse | DisplayNameApiResponse>[] = [
    statDataPromise,
    denomDataPromise,
    displayNamesPromise,
  ];

  return Promise.all(apiPromises).then((allResp) => {
    let result: StatData = {
      places: places,
      statVars: statVars,
      dates: [],
      data: null,
      sources: new Set(),
      latestCommonDate: "",
    };
    const numOccurencesPerDate: { [key: string]: number } = {};
    const numStatVarsPerPlace: { [key: string]: number } = {};
    const statResp = allResp[0] as StatApiResponse;
    const denomResp = allResp[1] as StatApiResponse;
    const displayNameMapping = allResp[2] as DisplayNameApiResponse;

    for (const place in statResp) {
      const placeData = statResp[place].data;
      for (const statVar in placeData) {
        if (perCapita) {
          if (Object.keys(denominators).length === 0) {
            placeData[statVar] = computePerCapita(
              placeData[statVar],
              denomResp[place].data[TOTAL_POPULATION_SV],
              scaling
            );
          } else if (statVar in denominators) {
            placeData[statVar] = computePerCapita(
              placeData[statVar],
              denomResp[place].data[denominators[statVar]],
              scaling
            );
          }
        }
      }
      // Build the dates collection, get the union of available dates for all data
      if (!placeData) {
        continue;
      }
      if (!(place in numStatVarsPerPlace)) {
        numStatVarsPerPlace[place] = 0;
      }
      if (displayNameMapping[place]) {
        statResp[place].name = displayNameMapping[place];
      }
      for (const statVar in placeData) {
        const timeSeries = placeData[statVar];
        if (timeSeries.val && Object.keys(timeSeries.val).length > 0) {
          numStatVarsPerPlace[place] = numStatVarsPerPlace[place] + 1;
        }
        if (timeSeries.metadata) {
          result.sources.add(timeSeries.metadata.provenanceUrl);
        }
        for (const date in timeSeries.val) {
          if (date in numOccurencesPerDate) {
            numOccurencesPerDate[date] = numOccurencesPerDate[date] + 1;
          } else {
            numOccurencesPerDate[date] = 1;
          }
        }
      }
    }
    result.data = statResp;

    result.dates = Object.keys(numOccurencesPerDate);
    result.dates.sort();
    // Get the number of places that have data, then get the latest date which
    // has data for every stat var for every place with data.
    // If there's no such date, choose the latest date with data for any stat var
    const numPlacesWithData: number = places.filter(
      (place) => numStatVarsPerPlace[place] > 0
    ).length;
    let idx = result.dates.length - 1;
    while (idx >= 0) {
      const currDate = result.dates[idx];
      if (
        numOccurencesPerDate[currDate] ===
        numPlacesWithData * statVars.length
      ) {
        result.latestCommonDate = currDate;
        if (delta) {
          result = convertToDelta(result);
        }
        return result;
      }
      idx--;
    }
    result.latestCommonDate = result.dates[result.dates.length - 1];
    if (delta) {
      result = convertToDelta(result);
    }
    return result;
  });
}
