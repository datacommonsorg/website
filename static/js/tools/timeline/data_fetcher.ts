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
  EntitySeries,
  Observation,
  Series,
  SeriesAllApiResponse,
  SeriesApiResponse,
  StatMetadata,
} from "../../shared/stat_types";
import { stringifyFn } from "../../utils/axios";
import { getPlaceDisplayNames } from "../../utils/place_utils";
import { computeRatio } from "../shared_util";

export interface StatData {
  places: string[];
  statVars: string[];
  dates: string[];
  sources: Set<string>;
  measurementMethods: Set<string>;
  // Keyed by stat var dcid, then place dcid.
  data: Record<string, EntitySeries>;
  // Keyed by facet id.
  facets: Record<string, StatMetadata>;
  displayNames?: DisplayNameApiResponse;
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
    if (!statData.data[statVar] || !statData.data[statVar][place]) {
      continue;
    }
    const timeSeries = statData.data[statVar][place];
    for (const obs of timeSeries.series) {
      dataPoints.push({
        label: obs.date,
        time: new Date(obs.date).getTime(),
        value: obs.value,
      });
    }
    result.push(new DataGroup(statVar, dataPoints));
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
  for (const statVar in result.data) {
    for (const place in result.data[statVar]) {
      const series = result.data[statVar][place].series;
      const delta: Series = {
        facet: result.data[statVar][place].facet,
        series: [],
      };
      if (series.length > 1) {
        for (let i = 0; i < series.length - 1; i++) {
          delta.series.push({
            date: series[i + 1].date,
            value: series[i + 1].value - series[i].value,
          });
        }
      }
      result.data[statVar][place] = delta;
      const index = result.dates.indexOf(series[0].date);
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
  for (const statVar in result.data) {
    for (const place in result.data[statVar]) {
      const series = result.data[statVar][place];
      const obsList: Observation[] = [];
      for (const obs of series.series) {
        const date = obs.date;
        const year = date.slice(0, 4);
        if ((minYear && year < minYear) || (maxYear && date > maxYear)) {
          const index = result.dates.indexOf(date);
          if (index > -1) {
            result.dates.splice(index, 1);
          }
        } else {
          obsList.push(obs);
        }
      }
      series.series = obsList;
    }
  }
  return result;
}

export interface TimelineRawData {
  // Map of place dcid to display name
  displayNames: DisplayNameApiResponse;
  // Map of stat var dcid to a map of metahash (identifying string) to source
  // metadata for sources available for that stat var.
  metadataMap: Record<string, Record<string, StatMetadata>>;
  // Data for all available source series for each stat var for each place
  statAllData: SeriesAllApiResponse;
  // Data for a single time series for the denom stat var for each place
  denomData?: SeriesApiResponse;
}

/**
 * Promise that returns the raw data needed for Timeline tool
 */
export function fetchRawData(
  places: string[],
  statVars: string[],
  denom = ""
): Promise<TimelineRawData> {
  let denomDataPromise: Promise<SeriesApiResponse> = Promise.resolve({
    data: {},
    facets: {},
  });
  if (denom) {
    denomDataPromise = axios
      .get("/api/observations/series", {
        params: {
          entities: places,
          variables: [denom],
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        return resp.data;
      });
  }
  const displayNamesPromise: Promise<DisplayNameApiResponse> =
    getPlaceDisplayNames(places);

  const statAllDataPromise: Promise<SeriesAllApiResponse> = axios
    .get("/api/observations/series/all", {
      params: {
        entities: places,
        variables: statVars,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      return resp.data;
    });

  return Promise.all([
    denomDataPromise,
    displayNamesPromise,
    statAllDataPromise,
  ]).then(([denomData, displayNames, statAllData]) => {
    const metadataMap = {};
    for (const statVar in statAllData.data) {
      metadataMap[statVar] = {};
      for (const place in statAllData.data[statVar]) {
        for (const series of statAllData.data[statVar][place]) {
          metadataMap[statVar][series.facet] = statAllData.facets[series.facet];
        }
      }
    }
    return {
      denomData,
      statAllData,
      displayNames,
      metadataMap,
    };
  });
}

/**
 * Given raw data and timeline chart options, gets the StatData for the chart.
 * @param rawData raw timeline data
 * @param places places to get data for
 * @param statVars stat vars to get data for
 * @param metahashMap map of stat var dcid to metahash
 * @param isRatio whether or not to calculate ratio
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
    displayNames: {},
    facets: rawData.statAllData.facets,
  };
  const facets = Object.assign(
    rawData.statAllData.facets,
    rawData.denomData.facets
  );
  const allDates = new Set<string>();

  for (const sv of statVars) {
    const svData: EntitySeries = {};
    for (const place of places) {
      let selectedSeries: Series = null;
      const targetFacetId = metahashMap[sv];
      // The series list of rawData.statAllData.data[sv][place] is ordered
      // by the preference, where the best series is at the front.
      for (const rawSeries of rawData.statAllData.data[sv][place]) {
        const facetId = rawSeries.facet;
        const series = _.cloneDeep(rawSeries);
        if (_.isEmpty(series.series)) {
          break;
        }
        if (_.isEmpty(targetFacetId)) {
          selectedSeries = series;
          break;
        }
        if (facetId == targetFacetId) {
          selectedSeries = series;
          break;
        }
      }
      if (_.isEmpty(selectedSeries)) {
        continue;
      }
      if (isRatio && denom) {
        const hasDenomSeries =
          denom in rawData.denomData.data &&
          place in rawData.denomData.data[denom];
        if (!hasDenomSeries) {
          // TODO: add error message or some way to show that denom data is
          // is missing
          continue;
        }
        selectedSeries.series = computeRatio(
          selectedSeries.series,
          rawData.denomData.data[denom][place].series,
          scaling
        );
        result.sources.add(
          facets[rawData.denomData.data[denom][place].facet].provenanceUrl
        );
      }
      svData[place] = selectedSeries;
    }
    if (_.isEmpty(svData)) {
      continue;
    }
    for (const place in svData) {
      const timeSeries = svData[place];
      if (timeSeries.facet) {
        result.sources.add(facets[timeSeries.facet].provenanceUrl);
        const mmethod = facets[timeSeries.facet].measurementMethod;
        if (mmethod) {
          result.measurementMethods.add(mmethod);
        }
      }
      for (const obs of timeSeries.series) {
        allDates.add(obs.date);
      }
    }
    result.data[sv] = svData;
  }
  result.dates = Array.from(allDates.values()).sort();
  result.displayNames = rawData.displayNames;
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
  modelStatAllResponse: SeriesAllApiResponse,
  modelStatVars: string[]
): [StatData, StatData] {
  const modelData: StatData = {
    places: [],
    statVars: [],
    dates: [],
    data: {},
    sources: new Set<string>(),
    measurementMethods: new Set<string>(),
    facets: {},
  };
  if (!mainStatData.dates.length) {
    return [mainStatData, modelData];
  }
  const mainFacets = _.cloneDeep(mainStatData.facets);
  mainStatData.facets = {};
  const allFacets = modelStatAllResponse.facets;
  for (let index = 0; index < modelStatVars.length; index++) {
    const sv = modelStatVars[index];
    const svData = modelStatAllResponse.data[sv];
    modelData.statVars.push(sv);
    const computedFacetId = index.toString();
    for (const place in svData) {
      if (!(place in mainStatData.data[sv])) {
        continue;
      }
      modelData.places.push(place);
      const mainObsPeriod =
        mainFacets[mainStatData.data[sv][place].facet].observationPeriod;
      const dateVals = {};
      // Use one facet to build the computed facet;
      let sampledFacetId;
      for (const rawSeries of svData[place]) {
        const facetId = rawSeries.facet;
        const series = rawSeries.series;
        const metadata = allFacets[facetId];
        if (metadata.observationPeriod !== mainObsPeriod) {
          continue;
        }
        mainStatData.measurementMethods.delete(metadata.measurementMethod);
        modelData.measurementMethods.add(metadata.measurementMethod);
        modelData.sources.add(metadata.provenanceUrl);
        for (const obs of series) {
          if (!(obs.date in dateVals)) {
            dateVals[obs.date] = [];
          }
          dateVals[obs.date].push(obs.value);
        }
        const newSv = `${sv}-${metadata.measurementMethod}`;
        if (!(newSv in modelData.data)) {
          modelData.data[newSv] = {};
        }
        modelData.data[newSv][place] = rawSeries;
        modelData.statVars.push(newSv);
        modelData.facets[facetId] = allFacets[facetId];
        sampledFacetId = facetId;
      }
      const means: Observation[] = [];
      for (const date in dateVals) {
        means.push({
          date: date,
          value: _.mean(dateVals[date]),
        });
      }
      means.sort((a, b) => {
        return Date.parse(a.date) - Date.parse(b.date);
      });
      mainStatData.data[sv][place] = { series: means, facet: computedFacetId };
      mainStatData.facets[computedFacetId] = _.cloneDeep(
        allFacets[sampledFacetId]
      );
      mainStatData.facets[computedFacetId].measurementMethod =
        "Mean across models";
      delete mainStatData.facets[computedFacetId].importName;
    }
  }
  mainStatData.sources = modelData.sources;
  mainStatData.measurementMethods = new Set(["Mean across models"]);
  // mainStatData only has sources, measurementMethods, and facets relevant for
  // model stat vars. Go through all the data in mainStatData to add information
  // for the non model stat vars.
  for (const svData of Object.values(mainStatData.data)) {
    for (const series of Object.values(svData)) {
      const facetId = series.facet;
      const metadata = allFacets[facetId];
      if (!metadata) {
        continue;
      }
      mainStatData.facets[facetId] = metadata;
      if (metadata.provenanceUrl) {
        mainStatData.sources.add(metadata.provenanceUrl);
      }
      if (metadata.measurementMethod) {
        mainStatData.measurementMethods.add(metadata.measurementMethod);
      }
    }
  }
  modelData.statVars = Array.from(new Set(modelData.statVars));
  modelData.dates = mainStatData.dates;
  return [mainStatData, modelData];
}
