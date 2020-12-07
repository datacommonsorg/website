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
import { saveToFile } from "../../shared/util";
import { getStatsCollection, SourceSeries } from "./util";
import { Chart } from "./chart";
import {
  Context,
  NamedPlace,
  Axis,
  AxisWrapper,
  PlaceInfo,
  DateInfo,
  IsLoadingWrapper,
} from "./context";
import { StatsVarNode } from "../timeline_util";

/**
 * Represents a point in the scatter plot.
 */
interface Point {
  xVal: number;
  yVal: number;
  xPop: number;
  yPop: number;
  place: NamedPlace;
}

type Cache = Record<string, SourceSeries>;

function ChartLoader(): JSX.Element {
  const { x, y } = useContext(Context);
  const cache = useCache();
  const points = usePoints(cache);

  const xVal = x.value;
  const yVal = y.value;

  return (
    <div>
      {areStatVarNamesLoaded(xVal, yVal) && (
        <Chart
          points={points}
          xLabel={getLabel(xVal.name, xVal.perCapita)}
          yLabel={getLabel(yVal.name, yVal.perCapita)}
          xLog={xVal.log}
          yLog={yVal.log}
          xPerCapita={xVal.perCapita}
          yPerCapita={yVal.perCapita}
          xProvenance={getProvenance(cache, _.findKey(xVal.statVar))}
          yProvenance={getProvenance(cache, _.findKey(yVal.statVar))}
        />
      )}
    </div>
  );
}

/**
 * Hook that returns a cache containing population and statvar data.
 */
function useCache(): Cache {
  const { x, y, place, date, isLoading } = useContext(Context);

  // From statvar DCIDs to `SourceSeries` data
  const [cache, setCache] = useState({} as Cache);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;
  const dateVal = date.value;

  /**
   * When statvars, enclosing place, child place type, or any plot options change,
   * re-retreive data.
   */
  useEffect(() => {
    if (
      !arePlacesLoaded(placeVal) ||
      !areStatVarNamesLoaded(xVal, yVal) ||
      !isDateChosen(date.value)
    ) {
      setCache({});
      return;
    }
    if (!arePopulationsAndDataLoaded(cache, xVal, yVal, dateVal)) {
      loadPopulationsAndData(x, y, placeVal, dateVal, isLoading, setCache);
    }
  }, [xVal, yVal, placeVal, dateVal]);

  return cache;
}

/**
 * Checks if the date of data to retrieve is chosen.
 * Returns true if year is chosen, or year and month are chosen,
 * or year, month, and day are chosen.
 * @param date
 */
function isDateChosen(date: DateInfo): boolean {
  return (
    date.year > 0 ||
    (date.year > 0 && date.month > 0) ||
    (date.year > 0 && date.month > 0 && date.day > 0)
  );
}

/**
 * Converts `DateInfo` to a string of the form YYYY-MM-DD,
 * YYYY-MM, or YYYY, depending if month and day are chosen.
 * @param date
 */
function formatDate(date: DateInfo) {
  let str = date.year.toString();
  if (date.month) {
    str += `-${date.month}`;
    if (date.day) {
      str += `-${date.day}`;
    }
  }
  return str;
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
async function loadPopulationsAndData(
  x: AxisWrapper,
  y: AxisWrapper,
  place: PlaceInfo,
  date: DateInfo,
  isLoading: IsLoadingWrapper,
  setCache: (cache: Cache) => void
) {
  const dateString = formatDate(date);
  isLoading.increment();
  const populationAndData = await getStatsCollection(
    place.enclosingPlace.dcid,
    place.enclosedPlaceType,
    dateString,
    [
      // Populations
      getPopulationStatVar(x.value.statVar),
      getPopulationStatVar(y.value.statVar),
      // Statvar data
      _.findKey(x.value.statVar),
      _.findKey(y.value.statVar),
    ]
  );
  isLoading.decrement();
  if (!arePopulationsAndDataLoaded(populationAndData, x.value, y.value, date)) {
    alert(`Sorry, no data available for ${dateString}`);
  } else {
    setCache(populationAndData);
  }
}

/**
 * Gets the provenance for a statvar from the cache.
 * Returns an empty string if the statvar is not in the
 * cache.
 * @param cache
 * @param statVar
 */
function getProvenance(cache: Cache, statVar: string) {
  if (statVar in cache) {
    return cache[statVar].provenanceDomain;
  }
  return "";
}

/**
 * Hook that returns an array of points for plotting.
 * @param cache
 */
function usePoints(cache: Cache): Array<Point> {
  const { x, y, place, date } = useContext(Context);
  const [points, setPoints] = useState([] as Array<Point>);

  const xVal = x.value;
  const yVal = y.value;
  const placeVal = place.value;
  const dateVal = date.value;

  /**
   * Regenerates points after populations and statvar data are retrieved
   * and after plot options change.
   */
  useEffect(() => {
    if (
      _.isEmpty(cache) ||
      !arePopulationsAndDataLoaded(cache, xVal, yVal, dateVal)
    ) {
      return;
    }
    const points = getPoints(xVal, yVal, placeVal, cache);
    setPoints(computeCapita(points, xVal.perCapita, yVal.perCapita));

    const downloadButton = document.getElementById("download-link");
    if (downloadButton) {
      downloadButton.style.visibility = "visible";
      downloadButton.onclick = () =>
        downloadData(xVal, yVal, placeVal, dateVal, points);
    }
  }, [cache, xVal, yVal]);

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
  const xData = cache[_.findKey(x.statVar)];
  const yData = cache[_.findKey(y.statVar)];
  const xPops = cache[getPopulationStatVar(x.statVar)];
  const yPops = cache[getPopulationStatVar(y.statVar)];
  const lower = place.lowerBound;
  const upper = place.upperBound;
  return (
    place.enclosedPlaces
      // Map to `Point`s
      .map((namedPlace) => ({
        xVal: xData.val[namedPlace.dcid],
        yVal: yData.val[namedPlace.dcid],
        xPop: xPops.val[namedPlace.dcid],
        yPop: yPops.val[namedPlace.dcid],
        place: namedPlace,
      }))
      // Filter out unavailable data
      .filter(
        ({ xVal, yVal, xPop, yPop }) =>
          !_.isNil(xVal) &&
          !_.isNil(yVal) &&
          // If not per capita, allow populations to be not available
          (!_.isNil(xPop) || !x.perCapita) &&
          (!_.isNil(yPop) || !y.perCapita) &&
          isBetween(xPop, lower, upper) &&
          isBetween(yPop, lower, upper)
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
 * Checks if the population data (for per capita) and statvar data
 * have been loaded for both axes.
 * @param x
 * @param y
 */
function arePopulationsAndDataLoaded(
  cache: Cache,
  x: Axis,
  y: Axis,
  date: DateInfo
): boolean {
  const xStatVar = _.findKey(x.statVar);
  const yStatVar = _.findKey(y.statVar);
  const xPopStatVar = getPopulationStatVar(x.statVar);
  const yPopStatVar = getPopulationStatVar(y.statVar);
  return (
    xStatVar in cache &&
    !_.isEmpty(cache[xStatVar]) &&
    yStatVar in cache &&
    !_.isEmpty(cache[yStatVar]) &&
    xPopStatVar in cache &&
    !_.isEmpty(cache[xPopStatVar]) &&
    yPopStatVar in cache &&
    !_.isEmpty(cache[yPopStatVar]) &&
    // Checking the date of one axis is enough because all
    // statvars share the same date
    formatDate(date) === cache[xStatVar].date
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
  date: DateInfo,
  points: Array<Point>
): void {
  const xStatVar = _.findKey(x.statVar);
  const yStatVar = _.findKey(y.statVar);
  const xPopStatVar = getPopulationStatVar(x.statVar);
  const yPopStatVar = getPopulationStatVar(y.statVar);

  // Headers
  let csv =
    "placeName," +
    "placeDCID," +
    `xValue-${xStatVar},` +
    `yValue-${yStatVar},` +
    `xPopulation-${xPopStatVar},` +
    `yPopulation-${yPopStatVar}\n`;
  // Data
  for (const { xVal, yVal, xPop, yPop, place } of points) {
    csv += `${place.name},${place.dcid},${xVal},${yVal},${xPop},${yPop}\n`;
  }

  saveToFile(
    `${xStatVar}+` +
      `${yStatVar}+` +
      `${place.enclosingPlace.name}+` +
      `${place.enclosedPlaceType}+` +
      `${formatDate(date)}.csv`,
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
  if (_.isNil(lower) || _.isNil(upper)) {
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
