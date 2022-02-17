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
  StatAllApiResponse,
} from "../../shared/stat_types";

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
  measurementMethods: Set<string>;
}

/**
 * Group data by stats var with time.
 * TODO: Make this a function of StatData
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
 * TODO: Make this a function of StatData
 *
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

export function shortenStatData(
  statData: StatData,
  minYear: string,
  maxYear: string
): StatData {
  const result = _.cloneDeep(statData);
  for (const place in result.data) {
    for (const statVar in result.data[place].data) {
      const val = result.data[place].data[statVar].val;
      for (const date in val) {
        if (minYear && date.slice(0, 4) < minYear) {
          delete val[date];
          const index = result.dates.indexOf(date);
          if (index > -1) {
            result.dates.splice(index, 1);
          }
        }
        if (maxYear && date.slice(0, 4) > maxYear) {
          delete val[date];
          const index = result.dates.indexOf(date);
          if (index > -1) {
            result.dates.splice(index, 1);
          }
        }
      }
    }
  }
  return result;
}

/**
 * Returns per capita computation applied to the time series
 *
 * @param statSeries Time series to apply per capita computation to.
 * @param denomSeries Population series data to use for the per capita computation.
 *
 * @returns TimeSeries with the per capita calculation applied to its values.
 */
export function computeRatio(
  statSeries: TimeSeries,
  denomSeries: TimeSeries,
  scaling = 1
): TimeSeries {
  if (!denomSeries.val) {
    return {};
  }
  const result = _.cloneDeep(statSeries);
  const popYears = Object.keys(denomSeries.val);
  popYears.sort();
  const yearMin = popYears[0];
  const yearMax = popYears[popYears.length - 1];
  for (const date in statSeries.val) {
    const year = date.split("-")[0];
    let pop: number;
    if (year in denomSeries.val) {
      pop = denomSeries.val[year];
    } else if (year < yearMin) {
      pop = denomSeries.val[yearMin];
    } else if (year > yearMax) {
      pop = denomSeries.val[yearMax];
    } else {
      // Choose the population year that is the closest to stat year.
      let minDiff = parseInt(yearMax);
      for (const y of popYears) {
        const diff = Math.abs(parseInt(y) - parseInt(year));
        if (diff < minDiff) {
          minDiff = diff;
          pop = denomSeries.val[y];
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
 * @param isRatio Whether to compute ratio of two stat vars.
 * @param scaling Scaling factor for per capita computation.
 * @param denom Denominator stat var, only used when isRatio = true.
 *
 * @returns A Promise of StatData object.
 */
export function fetchStatData(
  places: string[],
  statVars: string[],
  isRatio = false,
  scaling = 1,
  denom = ""
): Promise<StatData> {
  const statDataPromise: Promise<StatApiResponse> = axios
    .post(`/api/stats`, {
      places: places,
      statVars: statVars,
    })
    .then((resp) => {
      return resp.data;
    });
  let denomDataPromise: Promise<StatApiResponse>;
  if (isRatio && denom) {
    denomDataPromise = axios
      .post(`/api/stats`, {
        places: places,
        statVars: [denom],
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
    const result: StatData = {
      places: places,
      statVars: statVars,
      dates: [],
      data: null,
      sources: new Set(),
      measurementMethods: new Set(),
    };
    const allDates = new Set<string>();
    const statResp = allResp[0] as StatApiResponse;
    const denomResp = allResp[1] as StatApiResponse;
    const displayNameMapping = allResp[2] as DisplayNameApiResponse;

    for (const place in statResp) {
      const placeData = statResp[place].data;
      for (const statVar in placeData) {
        if (isRatio) {
          placeData[statVar] = computeRatio(
            placeData[statVar],
            denomResp[place].data[denom],
            scaling
          );
        }
      }

      if (!placeData) {
        continue;
      }
      if (displayNameMapping[place]) {
        statResp[place].name = displayNameMapping[place];
      }
      for (const statVar in placeData) {
        const timeSeries = placeData[statVar];
        if (timeSeries.metadata) {
          result.sources.add(timeSeries.metadata.provenanceUrl);
          const mmethod = timeSeries.metadata.measurementMethod;
          if (mmethod) {
            result.measurementMethods.add(mmethod);
          }
        }
        for (const date in timeSeries.val) {
          allDates.add(date);
        }
      }
    }
    result.data = statResp;
    result.dates = Array.from(allDates.values()).sort();
    return result;
  });
}

  /**
   * Creates a new StatData object for all measurement methods of the stat var,
   * with an artificial stat var in the form of StatVar-MMethod. The StatData
   * values for the StatVar is also updated to be the mean across the
   * measurement methods for the data.
   *
   * @param mainStatData StatData for the main data line to plot.
   * @param modelStatAllResponse StatAllApiResponse for all available measurement methods for the mainStatData.
   */
  export function statDataFromModels(mainStatData: StatData, modelStatAllResponse: StatAllApiResponse): [StatData, StatData] {
    const modelData = {
      places: [],
      statVars: [],
      dates: [],
      data: {},
      sources: new Set<string>(),
      measurementMethods: new Set<string>(),
    };
    if (!mainStatData.dates.length) {
      return [mainStatData, modelData];
    } for (const place in modelStatAllResponse.placeData) {
      const placeData = modelStatAllResponse.placeData[place];
      modelData.places.push(place);
      modelData.data[place] = { data: {} };
      for (const sv in modelStatAllResponse.placeData[place].statVarData) {
        const mainObsPeriod = mainStatData.data[place].data[sv].metadata.observationPeriod;
        modelData.statVars.push(sv);
        const svData = placeData.statVarData[sv];
        if ("sourceSeries" in svData) {
          const means = {};
          const sourceSeries = svData.sourceSeries;
          // Replace requested series with means across models.
          const keepSeries = [];
          for (const series of sourceSeries) {
            if (series.observationPeriod !== mainObsPeriod) {
              continue;
            }
            keepSeries.push(series);
            mainStatData.measurementMethods.delete(series.measurementMethod);
            modelData.measurementMethods.add(series.measurementMethod);
            modelData.sources.add(series.provenanceDomain);
            for (const date of Object.keys(series.val).sort()) {
              means[date] = date in means ? means[date] : [];
              means[date].push(series.val[date]);
            }
            const newSv = `${sv}-${series.measurementMethod}`;
            modelData.data[place].data[newSv] = { val: series.val };
            modelData.statVars.push(newSv);
          }
          for (const date in means) {
            means[date] = _.mean(means[date]);
          }
          svData.sourceSeries = keepSeries;
          mainStatData.data[place].data[sv].val = means;
          mainStatData.measurementMethods.add('Mean across models');
        }
      }
    }
    modelData.statVars = Array.from(new Set(modelData.statVars));
    mainStatData.sources = modelData.sources;
    modelData.dates = mainStatData.dates;
    return [mainStatData, modelData];
  }