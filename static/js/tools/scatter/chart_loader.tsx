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

import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";

import { Point } from "../../chart/draw_scatter";
import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { FacetSelectorFacetInfo } from "../../shared/facet_selector";
import {
  EntityObservation,
  EntityObservationList,
  PointAllApiResponse,
  PointApiResponse,
  SeriesApiResponse,
  StatMetadata,
} from "../../shared/stat_types";
import { saveToFile } from "../../shared/util";
import { scatterDataToCsv } from "../../utils/chart_csv_utils";
import { getSeriesWithin } from "../../utils/data_fetch_utils";
import { getPlaceScatterData } from "../../utils/scatter_data_utils";
import { Chart } from "./chart";
import {
  Axis,
  AxisWrapper,
  Context,
  IsLoadingWrapper,
  PlaceInfo,
} from "./context";
import {
  getStatAllWithinPlace,
  getStatWithinPlace,
  ScatterChartType,
} from "./util";

type Cache = {
  // key here is stat var.
  statVarsData: Record<string, EntityObservation>;
  allStatVarsData: Record<string, EntityObservationList>;
  metadataMap: Record<string, StatMetadata>;
  populationData: SeriesApiResponse;
  noDataError: boolean;
  xAxis: Axis;
  yAxis: Axis;
  place: PlaceInfo;
};

type ChartData = {
  points: { [placeDcid: string]: Point };
  sources: Set<string>;
  xUnit: string;
  yUnit: string;
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

  const xFacetInfo = getFacetInfo(
    xVal,
    cache.allStatVarsData,
    cache.metadataMap
  );
  const yFacetInfo = getFacetInfo(
    yVal,
    cache.allStatVarsData,
    cache.metadataMap
  );
  const onSvFacetIdUpdated = (update): void => {
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
          {cache.noDataError || _.isEmpty(chartData.points) ? (
            <div className="error-message">
              Sorry, no data available. Try different stat vars or place
              options.
            </div>
          ) : (
            <>
              <Chart
                points={chartData.points}
                xLabel={getLabel(xVal)}
                yLabel={getLabel(yVal)}
                xLog={xVal.log}
                yLog={yVal.log}
                xPerCapita={xVal.perCapita}
                yPerCapita={yVal.perCapita}
                xUnit={chartData.xUnit}
                yUnit={chartData.yUnit}
                placeInfo={place.value}
                display={display}
                sources={chartData.sources}
                svFacetId={{
                  [x.value.statVarDcid]: x.value.metahash,
                  [y.value.statVarDcid]: y.value.metahash,
                }}
                facetList={[xFacetInfo, yFacetInfo]}
                onSvFacetIdUpdated={onSvFacetIdUpdated}
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

  const [cache, setCache] = useState(null);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;

  /**
   * When statvars, enclosing place, child place type, or any plot options change,
   * re-retreive data.
   */
  useEffect(() => {
    if (
      !isLoading.areDataLoading &&
      !areDataLoaded(cache, xVal, yVal, placeVal)
    ) {
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
  const statResponsePromise: Promise<PointApiResponse> = getStatWithinPlace(
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    [x.value, y.value]
  );
  const statAllResponsePromise: Promise<PointAllApiResponse> =
    getStatAllWithinPlace(place.enclosingPlace.dcid, place.enclosedPlaceType, [
      x.value,
      y.value,
    ]);
  const populationSvList = new Set([DEFAULT_POPULATION_DCID]);
  for (const axis of [x.value, y.value]) {
    if (axis.denom) {
      populationSvList.add(axis.denom);
    }
  }
  const populationPromise: Promise<SeriesApiResponse> = getSeriesWithin(
    "",
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    Array.from(populationSvList)
  );
  Promise.all([statResponsePromise, statAllResponsePromise, populationPromise])
    .then(([statResponse, statAllResponse, populationData]) => {
      let metadataMap = statResponse.facets || {};
      metadataMap = Object.assign(metadataMap, statAllResponse.facets);
      const allStatVarsData = statAllResponse.data;
      const cache = {
        allStatVarsData,
        metadataMap,
        noDataError: _.isEmpty(statResponse.data),
        populationData,
        statVarsData: statResponse.data,
        xAxis: x.value,
        yAxis: y.value,
        place,
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
    if (
      _.isEmpty(cache) ||
      !areDataLoaded(cache, xVal, yVal, placeVal) ||
      _.isNull(placeVal.enclosedPlaces)
    ) {
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
      downloadButton.style.display = "inline-block";
      downloadButton.onclick = (): void =>
        downloadData(xVal, yVal, placeVal, chartData.points);
    }
  }, [cache, xVal, yVal, placeVal, display.chartType]);

  return chartData;
}

/**
 * Extract data for a given facet from all the facets data.
 *
 * TODO: this can be moved to a shared util module.
 */
function extractFacetData(
  data: EntityObservationList,
  facetId: string
): EntityObservation {
  if (_.isEmpty(facetId)) {
    return null;
  }
  const result = {};
  for (const place in data) {
    for (const obs of data[place]) {
      if (obs.facet === facetId) {
        result[place] = obs;
        break;
      }
    }
  }
  return result;
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
  let xStatData = extractFacetData(
    cache.allStatVarsData[x.statVarDcid],
    x.metahash
  );
  if (_.isEmpty(xStatData)) {
    xStatData = cache.statVarsData[x.statVarDcid];
  }
  let yStatData = extractFacetData(
    cache.allStatVarsData[y.statVarDcid],
    y.metahash
  );
  if (_.isEmpty(yStatData)) {
    yStatData = cache.statVarsData[y.statVarDcid];
  }
  const popBounds: [number, number] =
    chartType === ScatterChartType.MAP
      ? null
      : [place.lowerBound, place.upperBound];
  const points = {};
  const sources: Set<string> = new Set();
  let xUnit = "";
  let yUnit = "";
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
    xUnit = xUnit || placeChartData.xUnit;
    yUnit = yUnit || placeChartData.yUnit;
  }
  return { points, sources, xUnit, yUnit };
}

function getFacetInfo(
  axis: Axis,
  allStatVarsData: Record<string, EntityObservationList>,
  metadataMap: Record<string, StatMetadata>
): FacetSelectorFacetInfo {
  const filteredMetadataMap: Record<string, StatMetadata> = {};
  const sv = axis.statVarDcid;
  for (const place in allStatVarsData[sv]) {
    for (const obs of allStatVarsData[sv][place]) {
      if (obs.facet in metadataMap) {
        filteredMetadataMap[obs.facet] = metadataMap[obs.facet];
      }
    }
  }
  return {
    dcid: sv,
    metadataMap: filteredMetadataMap,
    name: axis.statVarInfo.title || sv,
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
function areDataLoaded(
  cache: Cache,
  x: Axis,
  y: Axis,
  place: PlaceInfo
): boolean {
  if (
    _.isEmpty(cache) ||
    _.isEmpty(cache.xAxis) ||
    _.isEmpty(cache.yAxis) ||
    _.isEmpty(cache.place)
  ) {
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
    cache.yAxis.denom === y.denom &&
    cache.place.enclosingPlace.dcid === place.enclosingPlace.dcid &&
    cache.place.enclosedPlaceType === place.enclosedPlaceType
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
  const csv = scatterDataToCsv(
    x.statVarDcid,
    DEFAULT_POPULATION_DCID,
    y.statVarDcid,
    DEFAULT_POPULATION_DCID,
    points
  );

  saveToFile(
    `${x.statVarDcid}+` +
      `${y.statVarDcid}+` +
      `${place.enclosingPlace.name}+` +
      `${place.enclosedPlaceType}.csv`,
    csv
  );
}

/**
 * Gets the label given an axis.
 * @param axis
 */
function getLabel(axis: Axis): string {
  const name = axis.statVarInfo.title || axis.statVarDcid;
  return `${name}${axis.perCapita ? " Per Capita" : ""}`;
}
