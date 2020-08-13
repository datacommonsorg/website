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
import { STATS_VAR_TEXT } from "./stats_var";

interface TimeSeries {
  data: {
    [key: string]: number;
  };
  placeName: string;
  placeDcid: string;
  provenanceDomain: string;
}

interface ApiResponse {
  [key: string]: TimeSeries | null;
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
    [key: string]: ApiResponse;
  };
  sources: Set<string>;

  constructor(
    places: string[],
    statsVars: string[],
    dates: string[],
    data: { [key: string]: ApiResponse }
  ) {
    this.places = places;
    this.statsVars = statsVars;
    this.dates = dates;
    this.data = data;
    this.sources = new Set<string>();
  }

  /**
   * Group data by place with stats var for a fixed date.
   *
   * @param date? The date of the data point. By default pick the last date
   * in the time series.
   */
  getPlaceGroupWithStatsVar(date?: string): DataGroup[] {
    if (!date) {
      date = this.dates.slice(-1)[0];
    }
    const result: DataGroup[] = [];
    for (const place of this.places) {
      const dataPoints: DataPoint[] = [];
      let placeName: string;
      for (const statsVar of this.statsVars) {
        if (!this.data[statsVar][place]) continue;
        const timeSeries = this.data[statsVar][place];
        if (timeSeries.data) {
          dataPoints.push({
            label: STATS_VAR_TEXT[statsVar],
            value: timeSeries.data[date],
          });
          placeName = timeSeries.placeName;
        }
      }
      if (dataPoints.length > 0) {
        result.push(new DataGroup(placeName, dataPoints));
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
        dataPoints.push({
          label: STATS_VAR_TEXT[statsVar],
          value: timeSeries.data[date],
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
      date = this.dates.slice(-1)[0];
    }
    const result: DataPoint[] = [];
    for (const statsVar of this.statsVars) {
      if (!this.data[statsVar][place]) continue;
      const timeSeries = this.data[statsVar][place];
      result.push({
        label: STATS_VAR_TEXT[statsVar],
        value: timeSeries.data[date],
      });
    }
    return result;
  }
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
  scaling = 1
): Promise<StatsData> {
  const n = statsVars.length;
  let dcidParams = `?`;
  for (const place of places) {
    dcidParams += `&dcid=${place}`;
  }
  const allDataPromises: Promise<AxiosResponse<ApiResponse>>[] = [];
  for (const statsVar of statsVars) {
    allDataPromises.push(axios.get(`/api/stats/${statsVar}${dcidParams}`));
  }
  if (perCapita) {
    allDataPromises.push(axios.get(`/api/stats/Count_Person${dcidParams}`));
  }
  return Promise.all(allDataPromises).then((allResp) => {
    const result = new StatsData(places, statsVars, [], {});
    const dates: { [key: string]: boolean } = {};
    for (let i = 0; i < n; i++) {
      result.data[statsVars[i]] = allResp[i].data;
      // Compute perCapita.
      if (perCapita) {
        for (const place in allResp[i].data) {
          if (!allResp[i].data[place]) continue;
          const dateValue = allResp[i].data[place].data;
          const population = allResp[n].data[place].data;
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
            result.data[statsVars[i]][place].data[date] /= pop / scaling;
          }
        }
      }
      // Build the dates collection, get the union of available dates for all data
      for (const place in allResp[i].data) {
        if (!allResp[i].data[place]) continue;
        const timeSeries = allResp[i].data[place];
        result.sources.add(timeSeries.provenanceDomain);
        for (const date in timeSeries.data) {
          dates[date] = true;
        }
      }
    }
    result.dates = Object.keys(dates);
    result.dates.sort();
    return result;
  });
}

export { StatsData, fetchStatsData };
