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

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import axios from "axios";
import { saveToFile } from "../../shared/util";
import {
  getPopulationDate,
  getStatsWithinPlace,
  nodeGetStatVar,
  PlacePointStat,
  SourceSeries,
} from "./util";
import { Chart } from "./chart";
import {
  Context,
  Axis,
  AxisWrapper,
  PlaceInfo,
  IsLoadingWrapper,
} from "./context";
import { NamedPlace } from "../../shared/types";
import { StatsVarNode } from "../statvar_menu/util";
import { PlotOptions } from "./plot_options";

/**
 * Represents a point in the scatter plot.
 */
interface Point {
  xVal: number;
  yVal: number;
  place: NamedPlace;
  xDate: string;
  yDate: string;
  xSource: string;
  ySource: string;
  xPop?: number;
  yPop?: number;
  xPopSource?: string;
  yPopSource?: string;
  xPopDate?: string;
  yPopDate?: string;
}

type Cache = {
  // key here is stat var.
  statsVarData: Record<string, PlacePointStat>;
  populationData: { [statVar: string]: { [dcid: string]: SourceSeries } };
  noDataError: boolean;
};

function ChartLoader(): JSX.Element {
  const { x, y, isLoading } = useContext(Context);
  const cache = useCache();
  const points = usePoints(cache);

  const xVal = x.value;
  const yVal = y.value;
  const shouldRenderChart =
    areStatVarNamesLoaded(xVal, yVal) &&
    !isLoading.areDataLoading &&
    !isLoading.arePlacesLoading;
  const xStatVar = nodeGetStatVar(xVal.statVar);
  const yStatVar = nodeGetStatVar(yVal.statVar);
  let xUnits = null;
  let yUnits = null;
  if (cache.statsVarData) {
    const xStatData = cache.statsVarData[xStatVar];
    const yStatData = cache.statsVarData[yStatVar];
    xUnits = xStatData ? getUnits(xStatData) : null;
    yUnits = yStatData ? getUnits(yStatData) : null;
  }
  return (
    <div>
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
                points={points}
                xLabel={getLabel(xVal.name, xVal.perCapita)}
                yLabel={getLabel(yVal.name, yVal.perCapita)}
                xLog={xVal.log}
                yLog={yVal.log}
                xPerCapita={xVal.perCapita}
                yPerCapita={yVal.perCapita}
                xStatVar={xStatVar}
                yStatVar={yStatVar}
                xUnits={xUnits}
                yUnits={yUnits}
              />
              <PlotOptions />
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Hook that returns a cache containing population and statvar data.
 */
function useCache(): Cache {
  const { x, y, place, isLoading } = useContext(Context);

  // From statvar DCIDs to `SourceSeries` data
  const [cache, setCache] = useState({} as Cache);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;

  /**
   * When statvars, enclosing place, child place type, or any plot options change,
   * re-retreive data.
   */
  useEffect(() => {
    if (!arePlacesLoaded(placeVal) || !areStatVarNamesLoaded(xVal, yVal)) {
      setCache({ statsVarData: {}, populationData: {}, noDataError: false });
      return;
    }
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
  const statVarsDataPromise = getStatsWithinPlace(
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    [nodeGetStatVar(x.value.statVar), nodeGetStatVar(y.value.statVar)]
  );
  const childPlaceDcids = place.enclosedPlaces.map(
    (placeInfo) => placeInfo.dcid
  );
  const xPopulationStatVar = getPopulationStatVar(x.value.statVar);
  const xPopulationPromise = axios
    .post(`/api/stats/${xPopulationStatVar}`, {
      dcid: childPlaceDcids,
    })
    .then((resp) => resp.data);
  const yPopulationStatVar = getPopulationStatVar(y.value.statVar);
  const yPopulationPromise =
    yPopulationStatVar !== xPopulationStatVar
      ? axios
          .post(`/api/stats/${yPopulationStatVar}`, {
            dcid: childPlaceDcids,
          })
          .then((resp) => resp.data)
      : Promise.resolve({});
  Promise.all([statVarsDataPromise, xPopulationPromise, yPopulationPromise])
    .then(([statsVarData, xPopulationData, yPopulationData]) => {
      const populationData = {};
      populationData[xPopulationStatVar] = xPopulationData;
      if (!_.isEmpty(yPopulationData)) {
        populationData[yPopulationStatVar] = yPopulationData;
      }
      const cache = {
        noDataError: _.isEmpty(statsVarData),
        populationData,
        statsVarData,
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
 * Hook that returns an array of points for plotting.
 * @param cache
 */
function usePoints(cache: Cache): Array<Point> {
  const { x, y, place } = useContext(Context);
  const [points, setPoints] = useState([] as Array<Point>);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;

  /**
   * Regenerates points after population and statvar data are retrieved
   * and after plot options change.
   */
  useEffect(() => {
    if (_.isEmpty(cache) || !areDataLoaded(cache, xVal, yVal)) {
      return;
    }
    const points = getPoints(xVal, yVal, placeVal, cache);
    setPoints(computeCapita(points, xVal.perCapita, yVal.perCapita));

    const downloadButton = document.getElementById("download-link");
    if (downloadButton) {
      downloadButton.style.visibility = "visible";
      downloadButton.onclick = () => downloadData(xVal, yVal, placeVal, points);
    }
  }, [cache, xVal, yVal, placeVal]);

  return points;
}

/**
 * Gets the DCID of the per capita denominator.
 * @param node
 */
function getPopulationStatVar(node: StatsVarNode): string {
  return Object.values(node)[0].denominators[0] || "Count_Person";
}

/**
 * Divides `xVal` and `yVal` by `xPop` and `yPop` if per capita is
 * selected for that axis.
 * @param points
 * @param xPerCapita
 * @param yPerCapita
 */
function computeCapita(
  points: Array<Point>,
  xPerCapita: boolean,
  yPerCapita: boolean
) {
  return points.map((point) => ({
    ...point,
    xVal: xPerCapita ? point.xVal / point.xPop : point.xVal,
    yVal: yPerCapita ? point.yVal / point.yPop : point.yVal,
  }));
}

/**
 * Constructs an array of points for plotting.
 * @param x
 * @param y
 * @param place
 * @param cache
 */
function getPoints(
  x: Axis,
  y: Axis,
  place: PlaceInfo,
  cache: Cache
): Array<Point> {
  const xStatData = cache.statsVarData[nodeGetStatVar(x.statVar)];
  const yStatData = cache.statsVarData[nodeGetStatVar(y.statVar)];
  const xPopData = cache.populationData[getPopulationStatVar(x.statVar)];
  const yPopData = cache.populationData[getPopulationStatVar(y.statVar)];
  const lower = place.lowerBound;
  const upper = place.upperBound;
  return (
    place.enclosedPlaces
      // Map to `Point`s
      .map((place) => {
        const placeXStatData = xStatData.stat[place.dcid];
        const placeYStatData = yStatData.stat[place.dcid];
        if (_.isEmpty(placeXStatData) || _.isEmpty(placeYStatData)) {
          return null;
        }
        let xPop = null;
        let xPopSource = null;
        let xPopDate = null;
        const placeXPopData = xPopData[place.dcid];
        if (placeXPopData) {
          xPopDate = getPopulationDate(placeXPopData, placeXStatData);
          xPop = placeXPopData.data[xPopDate];
          xPopSource = placeXPopData.provenanceUrl;
        }
        let yPop = null;
        let yPopSource = null;
        let yPopDate = null;
        const placeYPopData = yPopData[place.dcid];
        if (placeYPopData) {
          yPopDate = getPopulationDate(placeYPopData, placeYStatData);
          yPop = placeYPopData.data[yPopDate];
          yPopSource = placeYPopData.provenanceUrl;
        }
        return {
          place,
          xDate: placeXStatData.date,
          xPop,
          xPopDate,
          xPopSource,
          xSource:
            xStatData.metadata[placeXStatData.metadata.importName]
              .provenanceUrl,
          xVal: placeXStatData.value,
          yDate: placeYStatData.date,
          yPop,
          yPopDate,
          yPopSource,
          ySource:
            yStatData.metadata[placeYStatData.metadata.importName]
              .provenanceUrl,
          yVal: placeYStatData.value,
        };
      })
      // Filter out unavailable data
      .filter(
        (point) =>
          point &&
          !_.isNil(point.xVal) &&
          !_.isNil(point.yVal) &&
          // If not per capita, allow populations to be not available
          (!_.isNil(point.xPop) || !x.perCapita) &&
          (!_.isNil(point.yPop) || !y.perCapita) &&
          isBetween(point.xPop, lower, upper) &&
          isBetween(point.yPop, lower, upper)
      )
  );
}

/**
 * Checks if the child places have been loaded.
 * @param place
 */
function arePlacesLoaded(place: PlaceInfo): boolean {
  return (
    place.enclosedPlaceType &&
    place.enclosingPlace.dcid &&
    !_.isEmpty(place.enclosedPlaces)
  );
}

/**
 * Checks if the name of a statvar for an axis has been
 * loaded from the statvar menu.
 * @param axis
 */
function isStatVarNameLoaded(axis: Axis): boolean {
  return !_.isEmpty(axis.name);
}

/**
 * Checks if the names of the two statvars for both axes
 * has been loaded from the statvar menu.
 */
function areStatVarNamesLoaded(x: Axis, y: Axis): boolean {
  return isStatVarNameLoaded(x) && isStatVarNameLoaded(y);
}

/**
 * Checks if the population (for per capita) and statvar data
 * have been loaded for both axes.
 * @param x
 * @param y
 */
function areDataLoaded(cache: Cache, x: Axis, y: Axis): boolean {
  const xStatVar = nodeGetStatVar(x.statVar);
  const yStatVar = nodeGetStatVar(y.statVar);
  const xPopStatVar = getPopulationStatVar(x.statVar);
  const yPopStatVar = getPopulationStatVar(y.statVar);
  return (
    xStatVar in cache.statsVarData &&
    !_.isEmpty(cache.statsVarData[xStatVar]) &&
    yStatVar in cache.statsVarData &&
    !_.isEmpty(cache.statsVarData[yStatVar]) &&
    xPopStatVar in cache.populationData &&
    !_.isEmpty(cache.populationData[xPopStatVar]) &&
    yPopStatVar in cache.populationData &&
    !_.isEmpty(cache.populationData[yPopStatVar])
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
  points: Array<Point>
): void {
  const xStatVar = nodeGetStatVar(x.statVar);
  const yStatVar = nodeGetStatVar(y.statVar);
  const xPopStatVar = getPopulationStatVar(x.statVar);
  const yPopStatVar = getPopulationStatVar(y.statVar);

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
  for (const point of points) {
    const pointPlace = point.place;
    csv += `${pointPlace.name},${pointPlace.dcid},${point.xDate},${point.xVal},${point.yDate},${point.yVal},${point.xPop},${point.yPop}\n`;
  }

  saveToFile(
    `${xStatVar}+` +
      `${yStatVar}+` +
      `${place.enclosingPlace.name}+` +
      `${place.enclosedPlaceType}.csv`,
    csv
  );
}

/**
 * Checks if a number is in an inclusive range.
 * @param num
 * @param lower
 * @param upper
 */
function isBetween(num: number, lower: number, upper: number): boolean {
  if (_.isNil(lower) || _.isNil(upper) || _.isNil(num)) {
    return true;
  }
  return lower <= num && num <= upper;
}

/**
 * Formats a statvar name passed by the statvar menu to be an axis label.
 * @param name
 * @param perCapita
 */
function getLabel(name: string, perCapita: boolean): string {
  if (!name.endsWith("$")) {
    name = _.startCase(name);
  }
  return `${name}${perCapita ? " Per Capita" : ""}`;
}

function getUnits(placePointStat: PlacePointStat): string {
  const metadata = placePointStat.metadata;
  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.length > 0) {
    return metadata[metadataKeys[0]].unit;
  }
}

export { ChartLoader, Point };
