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

import { StatApiResponse } from "../../shared/stat_types";
import { NamedPlace } from "../../shared/types";
import { saveToFile } from "../../shared/util";
import { getPopulationDate, getUnit, PlacePointStat } from "../shared_util";
import { Chart } from "./chart";
import {
  Axis,
  AxisWrapper,
  Context,
  IsLoadingWrapper,
  PlaceInfo,
} from "./context";
import { PlotOptions } from "./plot_options";
import { arePlacesLoaded, getStatsWithinPlace } from "./util";

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

const DEFAULT_POPULATION_DCID = "Count_Person";

type Cache = {
  // key here is stat var.
  statVarsData: Record<string, PlacePointStat>;
  populationData: StatApiResponse;
  noDataError: boolean;
};

function ChartLoader(): JSX.Element {
  const { x, y, isLoading, display } = useContext(Context);
  const cache = useCache();
  const points = usePoints(cache);

  const xVal = x.value;
  const yVal = y.value;
  const shouldRenderChart =
    areStatVarInfoLoaded(xVal, yVal) &&
    !isLoading.areDataLoading &&
    !isLoading.arePlacesLoading;
  const xStatVar = xVal.statVarDcid;
  const yStatVar = yVal.statVarDcid;
  let xUnits = null;
  let yUnits = null;
  if (cache.statVarsData) {
    const xStatData = cache.statVarsData[xStatVar];
    const yStatData = cache.statVarsData[yStatVar];
    xUnits = xStatData ? getUnit(xStatData) : null;
    yUnits = yStatData ? getUnit(yStatData) : null;
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
                xLabel={getLabel(
                  xVal.statVarInfo.title || xVal.statVarDcid,
                  xVal.perCapita
                )}
                yLabel={getLabel(
                  yVal.statVarInfo.title || yVal.statVarDcid,
                  yVal.perCapita
                )}
                xLog={xVal.log}
                yLog={yVal.log}
                xPerCapita={xVal.perCapita}
                yPerCapita={yVal.perCapita}
                xStatVar={xStatVar}
                yStatVar={yStatVar}
                xUnits={xUnits}
                yUnits={yUnits}
                showQuadrants={display.showQuadrants}
                showLabels={display.showLabels}
                showDensity={display.showDensity}
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
    if (!arePlacesLoaded(placeVal) || !areStatVarInfoLoaded(xVal, yVal)) {
      setCache({
        statVarsData: {},
        populationData: {},
        noDataError: false,
      });
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
    [x.value.statVarDcid, y.value.statVarDcid]
  );
  const childPlaceDcids = place.enclosedPlaces.map(
    (placeInfo) => placeInfo.dcid
  );
  const xPopulationStatVar = DEFAULT_POPULATION_DCID;
  const yPopulationStatVar = DEFAULT_POPULATION_DCID;
  const populationPromise: Promise<StatApiResponse> = axios
    .post(`/api/stats`, {
      statVars: [xPopulationStatVar, yPopulationStatVar],
      places: childPlaceDcids,
    })
    .then((resp) => resp.data);

  Promise.all([statVarsDataPromise, populationPromise])
    .then(([statVarsData, populationData]) => {
      const cache = {
        noDataError: _.isEmpty(statVarsData),
        populationData,
        statVarsData,
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
  const xStatData = cache.statVarsData[x.statVarDcid];
  const yStatData = cache.statVarsData[y.statVarDcid];
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
        const placeXPopData =
          cache.populationData[place.dcid].data[DEFAULT_POPULATION_DCID];
        if (placeXPopData) {
          xPopDate = getPopulationDate(placeXPopData, placeXStatData);
          xPop = placeXPopData.val[xPopDate];
          xPopSource = placeXPopData.metadata.provenanceUrl;
        }
        let yPop = null;
        let yPopSource = null;
        let yPopDate = null;
        const placeYPopData =
          cache.populationData[place.dcid].data[DEFAULT_POPULATION_DCID];
        if (placeYPopData) {
          yPopDate = getPopulationDate(placeYPopData, placeYStatData);
          yPop = placeYPopData.val[yPopDate];
          yPopSource = placeYPopData.metadata.provenanceUrl;
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
  if (_.isEmpty(cache)) {
    return false;
  }
  const xStatVar = x.statVarDcid;
  const yStatVar = y.statVarDcid;
  return (
    xStatVar in cache.statVarsData &&
    !_.isEmpty(cache.statVarsData[xStatVar]) &&
    yStatVar in cache.statVarsData &&
    !_.isEmpty(cache.statVarsData[yStatVar])
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

export { ChartLoader, Point };
