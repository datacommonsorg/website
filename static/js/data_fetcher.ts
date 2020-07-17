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
import _ from "lodash";

import { DataPoint, DataGroup } from "./chart/base";
import { STATS_VAR_TEXT } from "./stats_var";

interface ApiResponse {
  [key: string]: {
    data: {
      [key: string]: number;
    };
    place_name: string;
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
    [key: string]: ApiResponse;
  };

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
  }

  /**
   * Group data by place with stats var for a fixed date.
   *
   * @param date? The date of the data point. By default pick the last date
   * in the time series.
   */
  getPlaceGroupWithStatsVar(date?: string) {
    if (!date) {
      date = this.dates.slice(-1)[0];
    }
    const result: DataGroup[] = [];
    for (const place of this.places) {
      const dataPoints: DataPoint[] = [];
      let placeName: string;
      for (const statsVar of this.statsVars) {
        if (this.data[statsVar][place]) {
          dataPoints.push({
            label: STATS_VAR_TEXT[statsVar],
            value: this.data[statsVar][place].data[date],
          });
          placeName = this.data[statsVar][place].place_name;
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
  getStatsVarGroupWithTime(place?: string) {
    if (!place) {
      place = this.places[0];
    }
    const result: DataGroup[] = [];
    for (const statsVar of this.statsVars) {
      const dataPoints: DataPoint[] = [];
      for (const date of this.dates) {
        dataPoints.push({
          label: date,
          value: this.data[statsVar][place].data[date],
        });
      }
      result.push(new DataGroup(STATS_VAR_TEXT[statsVar], dataPoints));
    }
    return result;
  }

  /**
   * Group data by time with stats var.
   *
   * @param place? The place to get the stats.
   */
  getTimeGroupWithStatsVar(place?: string) {
    if (!place) {
      place = this.places[0];
    }
    let result: DataGroup[] = [];
    for (const date of this.dates) {
      const dataPoints: DataPoint[] = [];
      for (const statsVar of this.statsVars) {
        dataPoints.push({
          label: STATS_VAR_TEXT[statsVar],
          value: this.data[statsVar][place].data[date],
        });
      }
      result.push(new DataGroup(date, dataPoints));
    }
    const interval = Math.floor(result.length / 5);
    if (interval > 0) {
      result = result.filter((element, index) => {
        return index % interval === 0;
      })
    }
    return result;
  }

  /**
   * Get points by stats var.
   *
   * @param place? The place to get the stats.
   * @param date? The date to get the stats.
   */
  getStatsPoint(place?: string, date?: string) {
    if (!place) {
      place = this.places[0];
    }
    if (!date) {
      date = this.dates.slice(-1)[0];
    }
    const result: DataPoint[] = [];
    for (const statsVar of this.statsVars) {
      result.push({
        label: STATS_VAR_TEXT[statsVar],
        value: this.data[statsVar][place].data[date],
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
  perCapita: boolean = false,
  scaling: number = 1
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
          if (!allResp[i].data[place]) {
            continue;
          }
          const population = allResp[n].data[place].data;
          const years = Object.keys(population);
          years.sort();
          const yearMin = years[0];
          const yearMax = years[years.length - 1];
          for (const date in allResp[i].data[place].data) {
            if (allResp[i].data[place].data.hasOwnProperty(date)) {
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
      }
      // Build the dates collection
      for (const place in allResp[i].data) {
        if (!allResp[i].data[place]) {
          continue;
        }
        // Build initial dates
        if (Object.keys(dates).length === 0) {
          for (const date in allResp[i].data[place].data) {
            if (allResp[i].data[place].data.hasOwnProperty(date)) {
              dates[date] = true;
            }
          }
        } else {
          // If a date is not in the new data, remove it from the current
          // collection.
          for (const date of Object.keys(dates)) {
            if (!(date in allResp[i].data[place].data)) {
              delete dates[date];
            }
          }
        }
      }
    }
    result.dates = Object.keys(dates);
    result.dates.sort();
    return result;
  });
}

export { StatsData, fetchStatsData };
