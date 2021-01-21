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

import axios, { AxiosResponse } from "axios";

import { DataPoint, DataGroup } from "../chart/base";
import { translateVariableString } from "../i18n/i18n";

const TOTAL_POPULATION_SV = "Count_Person";
const ZERO_POPULATION = 0;

interface TimeSeries {
  data: {
    [date: string]: number; // Date might be "latest" if it's from the cache
  };
  placeName?: string;
  placeDcid?: string;
  provenanceDomain: string;
}

interface StatApiResponse {
  [placeDcid: string]: TimeSeries | null;
}

interface DisplayNameApiResponse {
  [placeDcid: string]: string;
}

interface CachedStatVarDataMap {
  [geoId: string]: {
    [statVar: string]: TimeSeries;
  };
}

/**
 * Stats Data is keyed by statistical variable, then keyed by place dcid, with
 * value being the ApiResponse that contains multiple place time series.
 */
class StatsData {
  places: string[];
  statsVars: string[];
  dates: string[];
  data: {
    [statsVar: string]: StatApiResponse;
  };
  sources: Set<string>;
  latestCommonDate: string;

  constructor(
    places: string[],
    statsVars: string[],
    dates: string[],
    data: { [statsVar: string]: StatApiResponse },
    latestCommonDate: string
  ) {
    this.places = places;
    this.statsVars = statsVars;
    this.dates = dates;
    this.data = data;
    this.sources = new Set<string>();
    this.latestCommonDate = latestCommonDate;
  }

  /**
   * Group data by place with stats var for a fixed date.
   *
   * @param date? The date of the data point. By default pick the last date
   * in the time series.
   *
   * @param linkFn? An function to generate chart link from place dcid.
   */
  getPlaceGroupWithStatsVar(
    date?: string,
    linkFn?: (s: string) => string
  ): DataGroup[] {
    if (!date) {
      date = this.latestCommonDate;
    }
    const result: DataGroup[] = [];
    for (const place of this.places) {
      const dataPoints: DataPoint[] = [];
      let placeName: string;
      for (const statsVar of this.statsVars) {
        if (this.data[statsVar] && this.data[statsVar][place]) {
          const timeSeries = this.data[statsVar][place];
          if (timeSeries.data && timeSeries.data[date]) {
            placeName = timeSeries.placeName;
            dataPoints.push({
              label: translateVariableString(statsVar),
              value: timeSeries.data[date],
            });
          }
        }
      }
      if (dataPoints.length > 0) {
        const dg = new DataGroup(placeName, dataPoints);
        if (linkFn) {
          dg.link = linkFn(place);
        }
        result.push(dg);
      }
    }
    return result;
  }

  /**
   * Group data by stats var with time.
   *
   * @param place? The place to get the stats.
   */
  getStatsVarGroupWithTime(place?: string): DataGroup[] {
    if (!place) {
      place = this.places[0];
    }
    const result: DataGroup[] = [];
    for (const statsVar of this.statsVars) {
      const dataPoints: DataPoint[] = [];
      if (!this.data[statsVar][place]) continue;
      const timeSeries = this.data[statsVar][place];
      if (Object.keys(timeSeries.data).length !== 0) {
        for (const date of this.dates) {
          dataPoints.push({
            label: date,
            value: timeSeries.data[date] || null,
          });
        }
        result.push(new DataGroup(statsVar, dataPoints));
      }
    }
    return result;
  }

  /**
   * Group data by time with stats var.
   *
   * @param place? The place to get the stats.
   */
  getTimeGroupWithStatsVar(place?: string): DataGroup[] {
    if (!place) {
      place = this.places[0];
    }
    let result: DataGroup[] = [];
    for (const date of this.dates) {
      const dataPoints: DataPoint[] = [];
      for (const statsVar of this.statsVars) {
        if (!this.data[statsVar][place]) continue;
        const timeSeries = this.data[statsVar][place];
        let value;
        if (timeSeries.data[date]) {
          value = timeSeries.data[date];
        }
        dataPoints.push({
          label: translateVariableString(statsVar),
          value: value,
        });
      }
      result.push(new DataGroup(date, dataPoints));
    }
    const interval = Math.floor(result.length / 5);
    if (interval > 0) {
      result = result.filter((element, index) => {
        return index % interval === 0;
      });
    }
    return result;
  }

  /**
   * Get points by stats var.
   *
   * @param place? The place to get the stats.
   * @param date? The date to get the stats.
   */
  getStatsPoint(place?: string, date?: string): DataPoint[] {
    if (!place) {
      place = this.places[0];
    }
    if (!date) {
      date = this.latestCommonDate;
    }
    const result: DataPoint[] = [];
    for (const statsVar of this.statsVars) {
      if (!this.data[statsVar][place]) continue;
      const timeSeries = this.data[statsVar][place];
      result.push({
        label: translateVariableString(statsVar),
        value: timeSeries.data[date] || 0,
      });
    }
    return result;
  }
}

/**
 * Checks if all requested cached data is available in the cachedData.
 *
 * @param places A list of place dcids.
 * @param statsVars A list of statistical variable dcids.
 * @param cachedData Cached chart data with most stats vars for a place
 *
 * @returns true if all requested data is available, false otherwise.
 */
function isAllCachedDataAvailable(
  places: string[],
  statsVars: string[],
  denominators: string[],
  cachedData: CachedStatVarDataMap
): boolean {
  for (const place of places) {
    if (!(place in cachedData)) {
      return false;
    }
    for (const sv of statsVars.concat(denominators)) {
      if (!(sv in cachedData[place])) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Creates a StatApiResponse object
 *
 * @param place A place dcid
 * @param input Timeseries object
 *
 * @return StatApiResponse object with the place and input.
 */
function statApiResponseFromCacheData(
  statVar: string,
  places: string[],
  cachedData: CachedStatVarDataMap
): StatApiResponse {
  const result = {};
  for (const place of places) {
    result[place] = cachedData[place][statVar];
  }
  return result;
}

/**
 * Converts cached chart data to StatsData for a chart.
 * isAllCachedDataAvailable must be called before this to ensure requested data
 * is available.
 *
 * @param places A list of place dcids.
 * @param statsVars A list of statistical variable dcids.
 * @param perCapita Whether to compute per capita result.
 * @param scaling Scaling factor for per capita compuation.
 * @param cachedData Cached chart data with most stats vars for a place
 *
 * @returns StatsData object with only the requested statsVars.
 */
function getStatsDataFromCachedData(
  places: string[],
  statsVars: string[],
  perCapita = false,
  scaling = 1,
  denominators: string[] = [],
  cachedData: CachedStatVarDataMap = {}
): StatsData {
  if (denominators.length && denominators.length != statsVars.length) {
    console.log(
      "StatVars must have the same number of denominators, if specified"
    );
    return;
  }
  const result = new StatsData(places, statsVars, [], {}, "");
  const numOccurencesPerDate: { [key: string]: number } = {};
  const numStatVarsPerPlace: { [key: string]: number } = {};
  for (let i = 0; i < statsVars.length; i++) {
    const sv = statsVars[i];
    result.data[sv] = statApiResponseFromCacheData(sv, places, cachedData);
    if (perCapita) {
      result.data[sv] = computePerCapita(
        result.data[sv],
        statApiResponseFromCacheData(TOTAL_POPULATION_SV, places, cachedData),
        scaling
      );
    } else if (denominators.length) {
      result.data[sv] = computePerCapita(
        result.data[sv],
        statApiResponseFromCacheData(denominators[i], places, cachedData),
        scaling
      );
    }
    for (const place of places) {
      if (!(place in numStatVarsPerPlace)) {
        numStatVarsPerPlace[place] = 0;
      }
      const timeSeries = result.data[sv][place];
      result.sources.add(timeSeries.provenanceDomain);
      if (Object.keys(timeSeries.data).length > 0) {
        numStatVarsPerPlace[place] = numStatVarsPerPlace[place] + 1;
      }
      for (const date in timeSeries.data) {
        if (date in numOccurencesPerDate) {
          numOccurencesPerDate[date] = numOccurencesPerDate[date] + 1;
        } else {
          numOccurencesPerDate[date] = 1;
        }
      }
    }
  }

  result.dates = Object.keys(numOccurencesPerDate);
  result.dates.sort();
  // Get the number of places that have data, then get the latest date which has data for every stat var for every place with data.
  // If there's no such date, choose the latest date with data for any stat var
  const numPlacesWithData: number = places.filter(
    (place) => numStatVarsPerPlace[place] > 0
  ).length;
  let idx = result.dates.length - 1;
  while (idx >= 0) {
    const currDate = result.dates[idx];
    if (
      numOccurencesPerDate[currDate] ===
      numPlacesWithData * statsVars.length
    ) {
      result.latestCommonDate = currDate;
      return result;
    }
    idx--;
  }
  result.latestCommonDate = result.dates[result.dates.length - 1];
  return result;
}

/**
 * Returns per capita computation applied to the statVarResponse
 *
 * @param statsVarResponse Response to apply per capita computation to
 * @param populationResponse Population data to use for the per capita computation
 * @returns statVarResponse with the per capita calculation applied to it's values
 */
function computePerCapita(
  statsVarResponse: StatApiResponse,
  populationResponse: StatApiResponse,
  scaling = 1
): StatApiResponse {
  const result = { ...statsVarResponse };
  for (const place in statsVarResponse) {
    if (!statsVarResponse[place]) continue;
    const dateValue = statsVarResponse[place].data;
    const population = populationResponse[place].data;
    const years = Object.keys(population);
    years.sort();
    const yearMin = years[0];
    const yearMax = years[years.length - 1];
    for (const date in dateValue) {
      const year = date.split("-")[0];
      let pop: number;
      if (year in population) {
        pop = population[year];
      } else if (year < yearMin) {
        pop = population[yearMin];
      } else {
        pop = population[yearMax];
      }
      if (pop === ZERO_POPULATION) {
        result[place].data[date] = ZERO_POPULATION;
      } else {
        result[place].data[date] /= pop / scaling;
      }
    }
  }
  return result;
}

/**
 * Fetch statistical time series given a set of places and a set of statistical
 * variables.
 *
 * @param places A list of place dcids.
 * @param statsVars A list of statistical variable dcids.
 * @param perCapita Whether to compute per capita result.
 * @param scaling Scaling factor for per capita compuation.
 *
 * @returns A Promise of StatsData object.
 */
function fetchStatsData(
  places: string[],
  statsVars: string[],
  perCapita = false,
  scaling = 1,
  denominators: string[] = [],
  cachedData: CachedStatVarDataMap = {}
): Promise<StatsData> {
  if (denominators.length && denominators.length != statsVars.length) {
    console.log(
      "StatVars must have the same number of denominators, if specified"
    );
    return;
  }

  if (isAllCachedDataAvailable(places, statsVars, denominators, cachedData)) {
    return new Promise((resolve) => {
      resolve(
        getStatsDataFromCachedData(
          places,
          statsVars,
          perCapita,
          scaling,
          denominators,
          cachedData
        )
      );
    });
  }

  const numStatsVars = statsVars.length;
  let dcidParams = `?`;
  for (const place of places) {
    dcidParams += `&dcid=${place}`;
  }
  const apiDataPromises: Promise<AxiosResponse<StatApiResponse>>[] = [];
  for (const statsVar of statsVars) {
    apiDataPromises.push(axios.get(`/api/stats/${statsVar}${dcidParams}`));
  }
  if (perCapita) {
    apiDataPromises.push(
      axios.get(`/api/stats/${TOTAL_POPULATION_SV}${dcidParams}`)
    );
  } else {
    for (const denom of denominators) {
      apiDataPromises.push(axios.get(`/api/stats/${denom}${dcidParams}`));
    }
  }
  const displayNamesPromise: Promise<AxiosResponse<
    DisplayNameApiResponse
  >> = axios.get(`/api/place/displayname${dcidParams}`);

  // create list of promises containing apiDataPromises followed by displayNamesPromise
  const apiPromises: Promise<AxiosResponse<any>>[] = [];
  apiPromises.push(...apiDataPromises);
  apiPromises.push(displayNamesPromise);

  return Promise.all(apiPromises).then((allResp) => {
    const result = new StatsData(places, statsVars, [], {}, "");
    const numOccurencesPerDate: { [key: string]: number } = {};
    const numStatVarsPerPlace: { [key: string]: number } = {};
    const displayNameMapping =
      allResp.length > 0 && allResp[allResp.length - 1].data
        ? allResp[allResp.length - 1].data
        : {};
    for (let i = 0; i < numStatsVars; i++) {
      const sv = statsVars[i];
      result.data[sv] = allResp[i].data;
      if (perCapita) {
        result.data[sv] = computePerCapita(
          allResp[i].data,
          allResp[numStatsVars].data,
          scaling
        );
      } else if (denominators.length) {
        result.data[sv] = computePerCapita(
          allResp[i].data,
          allResp[i + numStatsVars].data,
          scaling
        );
      }
      // Build the dates collection, get the union of available dates for all data
      for (const place in allResp[i].data) {
        if (!(place in numStatVarsPerPlace)) {
          numStatVarsPerPlace[place] = 0;
        }
        if (!allResp[i].data[place]) continue;
        if (displayNameMapping[place]) {
          result.data[sv][place].placeName = displayNameMapping[place];
        }
        const timeSeries = allResp[i].data[place];
        if (Object.keys(timeSeries.data).length > 0) {
          numStatVarsPerPlace[place] = numStatVarsPerPlace[place] + 1;
        }
        result.sources.add(timeSeries.provenanceDomain);
        for (const date in timeSeries.data) {
          if (date in numOccurencesPerDate) {
            numOccurencesPerDate[date] = numOccurencesPerDate[date] + 1;
          } else {
            numOccurencesPerDate[date] = 1;
          }
        }
      }
    }
    result.dates = Object.keys(numOccurencesPerDate);
    result.dates.sort();
    // Get the number of places that have data, then get the latest date which has data for every stat var for every place with data.
    // If there's no such date, choose the latest date with data for any stat var
    const numPlacesWithData: number = places.filter(
      (place) => numStatVarsPerPlace[place] > 0
    ).length;
    let idx = result.dates.length - 1;
    while (idx >= 0) {
      const currDate = result.dates[idx];
      if (
        numOccurencesPerDate[currDate] ===
        numPlacesWithData * statsVars.length
      ) {
        result.latestCommonDate = currDate;
        return result;
      }
      idx--;
    }
    result.latestCommonDate = result.dates[result.dates.length - 1];
    return result;
  });
}

export { CachedStatVarDataMap, StatsData, fetchStatsData };
