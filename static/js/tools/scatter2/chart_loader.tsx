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
 * Chart component for retrieving, transforming, and plotting data.
 */

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import { saveToFile } from "../../shared/util";
import { getTimeSeriesLatestPoint } from "./util";
import { Spinner } from "./spinner";
import { Chart } from "./chart";
import { Context, NamedPlace, Axis, AxisWrapper, PlaceInfo } from "./context";

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

function ChartLoader(): JSX.Element {
  const context = useContext(Context);
  const [points, isLoading] = usePoints();

  const x = context.x.value;
  const y = context.y.value;

  return (
    <div>
      {areStatVarNamesLoaded(x, y) && (
        <Chart
          points={points}
          xLabel={getLabel(x.name, x.perCapita)}
          yLabel={getLabel(y.name, y.perCapita)}
          xLog={x.log}
          yLog={y.log}
          xPerCapita={x.perCapita}
          yPerCapita={y.perCapita}
        />
      )}
      <Spinner isOpen={isLoading} />
    </div>
  );
}

/**
 * Returns an array of points for plotting and a boolean
 * indicating if data are being loaded.
 */
function usePoints(): [Array<Point>, boolean] {
  const context = useContext(Context);
  const [points, setPoints] = useState([] as Array<Point>);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * When statvars, enclosing place, child place type, or any plot options change,
   * re-retreive data.
   */
  useEffect(() => {
    const place = context.place.value;
    if (!arePlacesLoaded(place)) {
      return;
    }
    const x = context.x;
    const y = context.y;
    if (!areStatVarNamesLoaded(x.value, y.value)) {
      return;
    }

    loadPopulationsAndDataIfNeeded(x, place);
    loadPopulationsAndDataIfNeeded(y, place);
    if (!arePopulationsAndDataLoaded(x.value, y.value)) {
      // The two `loadPopulationsAndDataIfNeeded` calls above are async.
      // If we get into this block, then it must be the case that
      // the population data and statvar data have not been loaded
      // for at least one of the axes.
      setIsLoading(true);
      return;
    }

    const points = getPoints(x.value, y.value, place);
    setPoints(points);
    setIsLoading(false);

    const downloadButton = document.getElementById("download-link");
    if (downloadButton) {
      downloadButton.style.visibility = "visible";
      downloadButton.onclick = () => downloadData(x.value, y.value, place);
    }
  }, [context]);

  return [points, isLoading];
}

/**
 * Constructs an array of points for plotting.
 * @param x
 * @param y
 * @param place
 */
function getPoints(x: Axis, y: Axis, place: PlaceInfo): Array<Point> {
  const lower = place.lowerBound;
  const upper = place.upperBound;
  return _.zip(
    x.data,
    y.data,
    x.populations,
    y.populations,
    place.enclosedPlaces
  )
    .filter(
      ([xVal, yVal, xPop, yPop]) =>
        xVal !== undefined &&
        yVal !== undefined &&
        xPop !== undefined &&
        yPop !== undefined &&
        isBetween(xPop, lower, upper) &&
        isBetween(yPop, lower, upper)
    )
    .map(([xVal, yVal, xPop, yPop, placeName]) => ({
      xVal: x.perCapita ? xVal / xPop : xVal,
      yVal: y.perCapita ? yVal / yPop : yVal,
      xPop: xPop,
      yPop: yPop,
      place: placeName,
    }));
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
 * Checks if the name of a statvar for an axis has been loaded from the statvar menu.
 * @param axis
 */
function isStatVarNameLoaded(axis: Axis): boolean {
  return !_.isEmpty(axis.name);
}

function areStatVarNamesLoaded(x: Axis, y: Axis): boolean {
  return isStatVarNameLoaded(x) && isStatVarNameLoaded(y);
}

/**
 * Checks if the population data (for per capita) and statvar data have been loaded
 * for both axes.
 * @param x
 * @param y
 */
function arePopulationsAndDataLoaded(x: Axis, y: Axis): boolean {
  return (
    !_.isEmpty(x.data) &&
    !_.isEmpty(y.data) &&
    !_.isEmpty(x.populations) &&
    !_.isEmpty(y.populations)
  );
}

/**
 * Saves data to a CSV file.
 * @param x
 * @param y
 * @param place
 */
function downloadData(x: Axis, y: Axis, place: PlaceInfo): void {
  if (!arePopulationsAndDataLoaded(x, y)) {
    alert("Sorry, still retrieving data. Please try again later.");
    return;
  }

  const xStatVar = _.findKey(x.statVar);
  const yStatVar = _.findKey(y.statVar);
  // Headers
  let csv =
    `xValue-${xStatVar},` +
    `yValue-${yStatVar},` +
    `${x.statVar[xStatVar].denominators[0] || "xPopulation-Count_Person"},` +
    `${y.statVar[yStatVar].denominators[0] || "yPopulation-Count_Person"}\n`;
  // Data
  for (const [xVal, yVal, xPop, yPop] of _.zip(
    x.data,
    y.data,
    x.populations,
    y.populations
  )) {
    csv +=
      `${xVal === undefined ? "" : xVal},` +
      `${yVal === undefined ? "" : yVal},` +
      `${xPop === undefined ? "" : xPop},` +
      `${yPop === undefined ? "" : yPop}\n`;
  }

  saveToFile(
    `${x.name}-` +
      `${y.name}-` +
      `${place.enclosingPlace.name}-` +
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
  if (_.isNil(lower) || _.isNil(upper)) {
    return true;
  }
  return lower <= num && num <= upper;
}

/**
 * Loads population data (for per capita) and statvar
 * data if they have been selected but not yet loaded.
 * @param axis
 * @param place
 */
async function loadPopulationsAndDataIfNeeded(
  axis: AxisWrapper,
  place: PlaceInfo
): Promise<void> {
  if (!_.isEmpty(axis.value.statVar)) {
    if (_.isEmpty(axis.value.populations)) {
      loadPopulations(axis, place);
    }
    if (_.isEmpty(axis.value.data)) {
      loadData(axis, place);
    }
  }
}

/**
 * Loads population data (for per capita) for an axis.
 * @param axis
 * @param place
 */
async function loadPopulations(
  axis: AxisWrapper,
  place: PlaceInfo
): Promise<void> {
  Promise.all(
    place.enclosedPlaces.map((namedPlace) =>
      getTimeSeriesLatestPoint(
        namedPlace.dcid,
        Object.values(axis.value.statVar)[0].denominators[0] || "Count_Person"
      ).catch(() => undefined)
    )
  ).then((populations) => axis.setPopulations(populations));
}

/**
 * Loads statvar data for an axis.
 * @param axis
 * @param place
 */
async function loadData(axis: AxisWrapper, place: PlaceInfo): Promise<void> {
  const data = await Promise.all(
    place.enclosedPlaces.map((namedPlace) =>
      getTimeSeriesLatestPoint(
        namedPlace.dcid,
        _.findKey(axis.value.statVar)
      ).catch(() => undefined)
    )
  );
  axis.setData(data);
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
