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

/**
 * Component for retrieving and transforming data into a form ready for plotting
 * and passing the data to a `Chart` component that plots the scatter plot.
 */

import axios from "axios";
import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { Point } from "../../chart/draw_scatter";
import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { SourceSelectorSvInfo } from "../../shared/source_selector";
import {
  PlacePointStat,
  StatApiResponse,
  StatMetadata,
} from "../../shared/stat_types";
import { saveToFile } from "../../shared/util";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import { getUnit } from "../shared_util";
import { Chart } from "./chart";
import {
  Axis,
  AxisWrapper,
  Context,
  IsLoadingWrapper,
  PlaceInfo,
} from "./context";
import {
  getAllStatsWithinPlace,
  getStatsWithinPlace,
  ScatterChartType,
} from "./util";

type Cache = {
  // key here is stat var.
  statVarsData: Record<string, PlacePointStat>;
  allStatVarsData: Record<string, Record<string, PlacePointStat>>;
  metadataMap: Record<string, StatMetadata>;
  populationData: StatApiResponse;
  noDataError: boolean;
  xAxis: Axis;
  yAxis: Axis;
};

type ChartData = {
  points: { [placeDcid: string]: Point };
  sources: Set<string>;
  xUnits: string;
  yUnits: string;
};

export function ChartLoader(): JSX.Element {
  const { x, y, place, display } = useContext(Context);
  const cache = useCache();
  const chartData = useChartData(cache);

  const xVal = x.value;
  const yVal = y.value;
  const shouldRenderChart =
    areStatVarInfoLoaded(xVal, yVal) && !_.isEmpty(chartData);
  if (!shouldRenderChart) {
    return <></>;
  }

  const xSourceSelectorSvInfo = getSourceSelectorSvInfo(
    xVal,
    cache.allStatVarsData,
    cache.metadataMap
  );
  const ySourceSelectorSvInfo = getSourceSelectorSvInfo(
    yVal,
    cache.allStatVarsData,
    cache.metadataMap
  );
  const onSvMetahashUpdated = (update) => {
    for (const sv of Object.keys(update)) {
      if (x.value.statVarDcid === sv) {
        x.setMetahash(update[sv]);
      } else if (y.value.statVarDcid === sv) {
        y.setMetahash(update[sv]);
      }
    }
  };
  return (
    <>
      {shouldRenderChart && (
        <>
          {cache.noDataError ? (
            <div className="error-message">
              Sorry, no data available. Try different stat vars or place
              options.
            </div>
          ) : (
            <>
              <Chart
                points={chartData.points}
                xLabel={xVal.statVarInfo.title || xVal.statVarDcid}
                yLabel={yVal.statVarInfo.title || yVal.statVarDcid}
                xLog={xVal.log}
                yLog={yVal.log}
                xPerCapita={xVal.perCapita}
                yPerCapita={yVal.perCapita}
                xUnits={chartData.xUnits}
                yUnits={chartData.yUnits}
                placeInfo={place.value}
                display={display}
                sources={chartData.sources}
                sourceSelectorSvInfo={[
                  xSourceSelectorSvInfo,
                  ySourceSelectorSvInfo,
                ]}
                onSvMetahashUpdated={onSvMetahashUpdated}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

/**
 * Hook that returns a cache containing population and statvar data.
 */
function useCache(): Cache {
  const { x, y, place, isLoading } = useContext(Context);

  const [cache, setCache] = useState({
    allStatVarsData: {},
    statVarsData: {},
    populationData: {},
    noDataError: false,
    metadataMap: {},
    xAxis: null,
    yAxis: null,
  });

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;

  /**
   * When statvars, enclosing place, child place type, or any plot options change,
   * re-retreive data.
   */
  useEffect(() => {
    if (!areDataLoaded(cache, xVal, yVal)) {
      loadData(x, y, placeVal, isLoading, setCache);
    }
  }, [xVal, yVal, placeVal]);

  return cache;
}

/**
 * Fills cache with population and statvar data.
 * @param x
 * @param y
 * @param place
 * @param date
 * @param isLoading
 * @param setCache
 */
async function loadData(
  x: AxisWrapper,
  y: AxisWrapper,
  place: PlaceInfo,
  isLoading: IsLoadingWrapper,
  setCache: (cache: Cache) => void
) {
  isLoading.setAreDataLoading(true);
  const statResponsePromise = getStatsWithinPlace(
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    [x.value, y.value]
  );
  const statAllResponsePromise = getAllStatsWithinPlace(
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    [x.value, y.value]
  );
  let populationSvParam = `&stat_vars=${DEFAULT_POPULATION_DCID}`;
  for (const axis of [x.value, y.value]) {
    if (axis.denom) {
      populationSvParam += `&stat_vars=${axis.denom}`;
    }
  }
  const populationPromise: Promise<StatApiResponse> = axios
    .get(
      "/api/stats/set/series/within-place" +
        `?parent_place=${place.enclosingPlace.dcid}` +
        `&child_type=${place.enclosedPlaceType}` +
        populationSvParam
    )
    .then((resp) => resp.data);
  Promise.all([statResponsePromise, statAllResponsePromise, populationPromise])
    .then(([statResponse, statAllResponse, populationData]) => {
      let metadataMap = statResponse.metadata || {};
      metadataMap = Object.assign(metadataMap, statAllResponse.metadata);
      const allStatVarsData: Record<
        string,
        Record<string, PlacePointStat>
      > = {};
      for (const sv of Object.keys(statAllResponse.data)) {
        allStatVarsData[sv] = {};
        for (const stat of statAllResponse.data[sv].statList) {
          if (stat.metaHash) {
            allStatVarsData[sv][stat.metaHash] = stat;
          }
        }
      }
      const cache = {
        allStatVarsData,
        metadataMap,
        noDataError: _.isEmpty(statResponse.data),
        populationData,
        statVarsData: statResponse.data,
        xAxis: x.value,
        yAxis: y.value,
      };
      isLoading.setAreDataLoading(false);
      setCache(cache);
    })
    .catch(() => {
      alert("Error fetching data.");
      isLoading.setAreDataLoading(false);
    });
}

/**
 * Hook that returns the processed chart data for rendering a scatter chart.
 * @param cache
 */
function useChartData(cache: Cache): ChartData {
  const { x, y, place, display } = useContext(Context);
  const [chartData, setChartData] = useState(null);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;

  /**
   * Regenerates chartData after population and statvar data are retrieved
   * and after plot options change.
   */
  useEffect(() => {
    if (_.isEmpty(cache) || !areDataLoaded(cache, xVal, yVal)) {
      return;
    }
    const chartData = getChartData(
      xVal,
      yVal,
      placeVal,
      display.chartType,
      cache
    );
    setChartData(chartData);

    const downloadButton = document.getElementById("download-link");
    if (downloadButton) {
      downloadButton.style.visibility = "visible";
      downloadButton.onclick = () =>
        downloadData(xVal, yVal, placeVal, chartData.points);
    }
  }, [cache, xVal, yVal, placeVal, display.chartType]);

  return chartData;
}

/**
 * Takes fetched data and processes it to be in a form that can be used for
 * rendering the chart component
 * @param x
 * @param y
 * @param place
 * @param chartType
 * @param cache
 */
function getChartData(
  x: Axis,
  y: Axis,
  place: PlaceInfo,
  chartType: ScatterChartType,
  cache: Cache
): ChartData {
  const xStatData =
    x.metahash && x.metahash in cache.allStatVarsData[x.statVarDcid]
      ? cache.allStatVarsData[x.statVarDcid][x.metahash]
      : cache.statVarsData[x.statVarDcid];
  const yStatData =
    y.metahash && y.metahash in cache.allStatVarsData[y.statVarDcid]
      ? cache.allStatVarsData[y.statVarDcid][y.metahash]
      : cache.statVarsData[y.statVarDcid];
  const popBounds: [number, number] =
    chartType === ScatterChartType.MAP
      ? null
      : [place.lowerBound, place.upperBound];
  const points = {};
  const sources: Set<string> = new Set();
  for (const namedPlace of place.enclosedPlaces) {
    const xDenom = x.perCapita ? x.denom : null;
    const yDenom = y.perCapita ? y.denom : null;
    const placeChartData = getPlaceScatterData(
      namedPlace,
      xStatData,
      yStatData,
      cache.populationData,
      cache.metadataMap,
      xDenom,
      yDenom,
      popBounds
    );
    if (_.isEmpty(placeChartData)) {
      continue;
    }
    placeChartData.sources.forEach((source) => {
      if (!_.isEmpty(source)) {
        sources.add(source);
      }
    });
    points[namedPlace.dcid] = placeChartData.point;
  }
  const xUnits = getUnit(cache.statVarsData[x.statVarDcid], cache.metadataMap);
  const yUnits = getUnit(cache.statVarsData[y.statVarDcid], cache.metadataMap);
  return { points, sources, xUnits, yUnits };
}

function getSourceSelectorSvInfo(
  axis: Axis,
  allStatVarsData: Record<string, Record<string, PlacePointStat>>,
  metadataMap: Record<string, StatMetadata>
): SourceSelectorSvInfo {
  const filteredMetadataMap: Record<string, StatMetadata> = {};
  const metahashList = allStatVarsData[axis.statVarDcid]
    ? Object.keys(allStatVarsData[axis.statVarDcid])
    : [];
  metahashList.forEach((metahash) => {
    if (metahash in metadataMap) {
      filteredMetadataMap[metahash] = metadataMap[metahash];
    }
  });
  return {
    dcid: axis.statVarDcid,
    metadataMap: filteredMetadataMap,
    metahash: axis.metahash,
    name: axis.statVarInfo.title || axis.statVarDcid,
  };
}
/**
 * Checks if the stat var info for an axis has been loaded.
 * @param axis
 */
function isStatVarInfoLoaded(axis: Axis): boolean {
  return !_.isNull(axis.statVarInfo);
}

/**
 * Checks if the stat var info for both axes has been loaded.
 */
function areStatVarInfoLoaded(x: Axis, y: Axis): boolean {
  return isStatVarInfoLoaded(x) && isStatVarInfoLoaded(y);
}

/**
 * Checks if the population (for per capita) and statvar data
 * have been loaded for both axes.
 * @param x
 * @param y
 */
function areDataLoaded(cache: Cache, x: Axis, y: Axis): boolean {
  if (_.isEmpty(cache) || _.isEmpty(cache.xAxis) || _.isEmpty(cache.yAxis)) {
    return false;
  }
  const xStatVar = x.statVarDcid;
  const yStatVar = y.statVarDcid;
  return (
    xStatVar in cache.statVarsData &&
    !_.isEmpty(cache.statVarsData[xStatVar]) &&
    yStatVar in cache.statVarsData &&
    !_.isEmpty(cache.statVarsData[yStatVar]) &&
    cache.xAxis.date === x.date &&
    cache.yAxis.date === y.date &&
    cache.xAxis.denom === x.denom &&
    cache.yAxis.denom === y.denom
  );
}

/**
 * Saves data to a CSV file.
 * @param points
 */
function downloadData(
  x: Axis,
  y: Axis,
  place: PlaceInfo,
  points: { [placeDcid: string]: Point }
): void {
  const xStatVar = x.statVarDcid;
  const yStatVar = y.statVarDcid;
  const xPopStatVar = DEFAULT_POPULATION_DCID;
  const yPopStatVar = DEFAULT_POPULATION_DCID;

  // Headers
  let csv =
    "placeName," +
    "placeDCID," +
    "xDate," +
    `xValue-${xStatVar},` +
    "yDate," +
    `yValue-${yStatVar},` +
    `xPopulation-${xPopStatVar},` +
    `yPopulation-${yPopStatVar}\n`;
  // Data
  for (const place of Object.keys(points)) {
    const point = points[place];
    csv += `${point.place.name},${point.place.dcid},${point.xDate},${point.xVal},${point.yDate},${point.yVal},${point.xPop},${point.yPop}\n`;
  }

  saveToFile(
    `${xStatVar}+` +
      `${yStatVar}+` +
      `${place.enclosingPlace.name}+` +
      `${place.enclosedPlaceType}.csv`,
    csv
  );
}
