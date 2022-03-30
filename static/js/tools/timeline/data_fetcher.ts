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
  SourceSeries,
  StatAllApiResponse,
  StatApiResponse,
  TimeSeries,
} from "../../shared/stat_types";
import { StatMetadata } from "../shared_util";

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

interface TimelineStatAllData {
  [place: string]: {
    [statVar: string]: { [metahash: string]: SourceSeries };
  };
}

export interface TimelineRawData {
  // Map of place dcid to display name
  displayNames: DisplayNameApiResponse;
  // Data for a single time series for each stat var for each place
  statData: StatApiResponse;
  // Map of stat var dcid to a map of metahash (identifying string) to source
  // metadata for sources available for that stat var.
  metadataMap: Record<string, Record<string, StatMetadata>>;
  // Data for all available source series for each stat var for each place
  statAllData: TimelineStatAllData;
  // Data for a single time series for the denom stat var for each place
  denomData: StatApiResponse;
}

/**
 * Given the metadata for a source, returns a string to identify that source
 */
function getMetahash(metadata: StatMetadata): string {
  let metahash = "";
  for (const key of [
    "importName",
    "measurementMethod",
    "observationPeriod",
    "scalingFactor",
    "unit",
  ]) {
    metahash += metadata[key];
  }
  return metahash;
}

/**
 * Promise that returns the raw data needed for Timeline tool
 */
export function fetchRawData(
  places: string[],
  statVars: string[],
  denom = ""
): Promise<TimelineRawData> {
  const statDataPromise: Promise<StatApiResponse> = axios
    .post(`/api/stats`, {
      places: places,
      statVars: statVars,
    })
    .then((resp) => {
      return resp.data;
    });
  let denomDataPromise: Promise<StatApiResponse> = Promise.resolve({});
  if (denom) {
    denomDataPromise = axios
      .post(`/api/stats`, {
        places: places,
        statVars: [denom],
      })
      .then((resp) => {
        return resp.data;
      });
  }
  const displayNamesPromise: Promise<DisplayNameApiResponse> = axios
    .get(`/api/place/displayname?dcid=${places.join("&dcid=")}`)
    .then((resp) => {
      return resp.data;
    });
  const statAllDataPromise: Promise<StatAllApiResponse> = axios
    .get(
      `/api/stats/all?places=${places.join(
        "&places="
      )}&statVars=${statVars.join("&statVars=")}`
    )
    .then((resp) => {
      return resp.data;
    });
  return Promise.all([
    statDataPromise,
    denomDataPromise,
    displayNamesPromise,
    statAllDataPromise,
  ]).then(([statData, denomData, displayNames, statAllData]) => {
    const metadataMap = {};
    const processedStatAllData = {};
    for (const place in statAllData.placeData) {
      const placeData = statAllData.placeData[place].statVarData;
      if (_.isEmpty(placeData)) {
        continue;
      }
      const processedPlaceData = {};
      for (const sv in placeData) {
        const sourceSeries = placeData[sv].sourceSeries;
        if (_.isEmpty(sourceSeries)) {
          continue;
        }
        const processedSourceSeries = {};
        for (const series of sourceSeries) {
          const metadata = {
            ...series,
            provenanceUrl: series.provenanceDomain,
          };
          // a SourceSeries object holds the data values in the val field and
          // the rest of the object contains the metadata of that source
          // series.
          delete metadata.val;
          // StatMetdata uses provenanceUrl for what SourceSeries stores in
          // provenanceDomain.
          delete metadata.provenanceDomain;
          const metahash = getMetahash(metadata);
          if (!metadataMap[sv]) {
            metadataMap[sv] = {};
          }
          metadataMap[sv][metahash] = metadata;
          processedSourceSeries[metahash] = series;
        }
        processedPlaceData[sv] = processedSourceSeries;
      }
      processedStatAllData[place] = processedPlaceData;
    }
    return {
      displayNames,
      statData,
      metadataMap,
      statAllData: processedStatAllData,
      denomData,
    };
  });
}

/**
 * Given raw data and timeline chart options, gets the StatData for the chart.
 * @param rawData raw timeline data
 * @param places places to get data for
 * @param statVars stat vars to get data for
 * @param metahashMap map of stat var dcid to metahash
 * @param isRatio whhether or not to calculate ratio
 * @param denom denominator to use when calculating ratio
 * @param scaling scaling factor to use when calculating ratio
 */
export function getStatData(
  rawData: TimelineRawData,
  places: string[],
  statVars: string[],
  metahashMap: Record<string, string>,
  isRatio: boolean,
  denom = "",
  scaling = 1
): StatData {
  const result: StatData = {
    places: places,
    statVars: statVars,
    dates: [],
    data: {},
    sources: new Set(),
    measurementMethods: new Set(),
  };

  const allDates = new Set<string>();

  for (const place of places) {
    const placeData = {};
    for (const sv of statVars) {
      let timeSeries = null;
      const metahash = metahashMap[sv];
      if (!_.isEmpty(metahash)) {
        const metadata = rawData.metadataMap[sv][metahash];
        const haveSeries =
          place in rawData.statAllData &&
          sv in rawData.statAllData[place] &&
          metahash in rawData.statAllData[place][sv];
        if (haveSeries) {
          timeSeries = {
            val: rawData.statAllData[place][sv][metahash].val,
            metadata,
          };
        }
      } else if (
        !_.isEmpty(rawData.statData[place]) &&
        !_.isEmpty(rawData.statData[place].data[sv])
      ) {
        timeSeries = rawData.statData[place].data[sv];
      }

      if (_.isEmpty(timeSeries)) {
        continue;
      }

      if (isRatio) {
        const hasDenomSeries =
          place in rawData.denomData && denom in rawData.denomData[place].data;
        if (!hasDenomSeries) {
          continue;
        }
        timeSeries = computeRatio(
          timeSeries,
          rawData.denomData[place].data[denom],
          scaling
        );
      }
      placeData[sv] = timeSeries;
    }
    if (_.isEmpty(placeData)) {
      continue;
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
    const placeName = rawData.displayNames[place] || "";
    result.data[place] = {
      data: placeData,
      name: placeName,
    };
  }
  result.dates = Array.from(allDates.values()).sort();
  return result;
}

/**
 * Creates a new StatData object for all measurement methods of the stat var,
 * with an artificial stat var in the form of StatVar-MMethod. The StatData
 * values for the StatVar is also updated to be the mean across the
 * measurement methods for the data.
 *
 * @param mainStatData StatData for the main data line to plot.
 * @param modelStatAllResponse StatAllApiResponse for all available measurement methods for the mainStatData.
 *
 * @return pair of (transformed mainStatData with mean values, processed model StatData)
 */
export function statDataFromModels(
  mainStatData: StatData,
  modelStatAllResponse: TimelineStatAllData,
  modelStatVars: string[]
): [StatData, StatData] {
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
  }
  for (const place in modelStatAllResponse) {
    const placeData = modelStatAllResponse[place];
    modelData.places.push(place);
    modelData.data[place] = { data: {} };
    for (const sv of modelStatVars) {
      if (!(place in mainStatData.data)) {
        continue;
      }
      const mainObsPeriod =
        mainStatData.data[place].data[sv].metadata.observationPeriod;
      modelData.statVars.push(sv);
      if (sv in placeData) {
        const dateVals = {};
        const means = {};
        const sourceSeries = placeData[sv];
        for (const series of Object.values(sourceSeries)) {
          if (series.observationPeriod !== mainObsPeriod) {
            continue;
          }
          mainStatData.measurementMethods.delete(series.measurementMethod);
          modelData.measurementMethods.add(series.measurementMethod);
          modelData.sources.add(series.provenanceDomain);
          for (const date of Object.keys(series.val).sort()) {
            dateVals[date] = date in dateVals ? dateVals[date] : [];
            dateVals[date].push(series.val[date]);
          }
          const newSv = `${sv}-${series.measurementMethod}`;
          modelData.data[place].data[newSv] = { val: series.val };
          modelData.statVars.push(newSv);
        }
        for (const date in dateVals) {
          means[date] = _.mean(dateVals[date]);
        }
        mainStatData.data[place].data[sv].val = means;
        mainStatData.measurementMethods.add("Mean across models");
      }
    }
  }
  modelData.statVars = Array.from(new Set(modelData.statVars));
  mainStatData.sources = modelData.sources;
  modelData.dates = mainStatData.dates;
  return [mainStatData, modelData];
}
