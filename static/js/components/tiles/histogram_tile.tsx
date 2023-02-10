/**
 * Copyright 2023 Google LLC
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
 * Component for rendering a histogram type tile.
 */

import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { DataPoint } from "../../chart/base";
import { drawHistogram } from "../../chart/draw";
import { NamedTypedPlace } from "../../shared/types";
import {
  DisasterEventPoint,
  DisasterEventPointData,
} from "../../types/disaster_event_map_types";
import { getDateRange } from "../../utils/disaster_event_map_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";

interface HistogramTilePropType {
  disasterEventData: DisasterEventPointData;
  id: string;
  place: NamedTypedPlace;
  selectedDate: string;
  title: string;
}

/**
 * Helper function to get YYYY-MM prefix of a Date object.
 */
function getMonthString(date: Date): string {
  return date.toISOString().slice(0, "YYYY-MM".length);
}

/**
 * Helper function to get the last date of a YYYY-MM string.
 * For example, given "2003-02", return "2003-02-28"
 */
function getLastDayOfMonth(dateString: string): string {
  const inputDate = new Date(`${dateString}Z`);
  const lastDay = new Date(
    inputDate.getUTCFullYear(),
    inputDate.getUTCMonth() + 1,
    0
  );
  return lastDay.toISOString().slice(0, "YYYY-MM-DD".length);
}

/**
 * Helper function for getting all months along x-axis to display.
 * Used for initializing bins when binning monthly.
 */
function getMonthsArray(
  dateSetting: string,
  disasterEventPoints: DisasterEventPoint[]
): string[] {
  // get start and end of dates to show data for
  let [startDate, endDate] = getDateRange(dateSetting);

  // specify full dates if start and end dates are just YYYY or YYYY-MM
  if (startDate.length == "YYYY".length && endDate.length == "YYYY".length) {
    startDate = `${startDate}-01-01`;
    endDate = `${endDate}-12-31`;
  } else if (
    startDate.length == "YYYY-MM".length &&
    endDate.length == "YYYY-MM".length
  ) {
    startDate = `${startDate}-01`;
    endDate = `${getLastDayOfMonth(endDate)}`;
  }

  // Update end date to the latest date we have data for, if our data ends
  // before the end of the date range. This prevents us from incorrectly
  // imputing 0s for dates the source(s) may not yet have data for.
  if (!_.isEmpty(disasterEventPoints)) {
    // Sort events into chronological order
    disasterEventPoints.sort((a, b) =>
      a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0
    );
    const lastDate =
      disasterEventPoints[disasterEventPoints.length - 1].startDate;
    if (lastDate < endDate) {
      endDate = lastDate;
    }
  }
  // Fill in months between start and end dates
  const months = new Array<string>();
  for (
    let date = new Date(startDate + "Z");
    getMonthString(date) <= getMonthString(new Date(endDate + "Z"));
    date.setMonth(date.getMonth() + 1)
  ) {
    months.push(getMonthString(new Date(date)));
  }
  return months;
}

/**
 * Helper function to bin data by month
 */
function binDataByMonth(
  disasterEventPoints: DisasterEventPoint[],
  dateSetting: string
): DataPoint[] {
  if (_.isEmpty(disasterEventPoints)) {
    return [];
  }

  // Track YYYY-MM -> number of events
  const bins = new Map<string, number>();

  // Initialize all bins at zero
  const monthsToPlot = getMonthsArray(dateSetting, disasterEventPoints);
  for (const month of monthsToPlot) {
    bins.set(month, 0);
  }

  for (const event of disasterEventPoints) {
    // Get start time in YYYY-MM
    const eventMonth = event.startDate.slice(0, "YYYY-MM".length);

    // Increment count in corresponding bin if event has at least
    // monthly granularity
    if (bins.has(eventMonth) && eventMonth.length == "YYYY-MM".length) {
      bins.set(eventMonth, bins.get(eventMonth) + 1);
    } else {
      console.log(`Skipped event ${event} that started on ${eventMonth}`);
    }
  }

  // Format binned data into DataPoint[]
  const histogramData = new Array<DataPoint>();
  bins.forEach((value, label) => {
    histogramData.push({ label: label, value: value });
  });

  return histogramData;
}

/**
 * Helper function to determine if data exists to display.
 */
function shouldShowHistogram(histogramData: DataPoint[]): boolean {
  return !_.isEmpty(histogramData);
}

/**
 * Main histogram tile component
 */
export function HistogramTile(props: HistogramTilePropType): JSX.Element {
  const svgContainer = useRef(null);
  const [histogramData, setHistogramData] = useState<DataPoint[]>(null);

  // format event data if data is available
  useEffect(() => {
    if (props.disasterEventData && props.disasterEventData.eventPoints) {
      processData(
        props.disasterEventData.eventPoints,
        props.selectedDate,
        setHistogramData
      );
    }
  }, [props]);

  useEffect(() => {
    if (shouldShowHistogram(histogramData)) {
      renderHistogram(props, histogramData);
    }
  }, [props, histogramData]);

  // for title formatting
  const rs: ReplacementStrings = {
    place: props.place.name,
    date: "",
  };

  // organize provenance info to pass to ChartTileContainer
  const sources = new Set<string>();
  if (props.disasterEventData && props.disasterEventData.provenanceInfo) {
    Object.values(props.disasterEventData.provenanceInfo).forEach(
      (provInfo) => {
        sources.add(provInfo.provenanceUrl);
      }
    );
  }

  // TODO (juliawu): add "sorry, we don't have data" message if data is
  //                 present at 6 months but not 30 days
  return (
    <>
      {shouldShowHistogram(histogramData) && (
        <ChartTileContainer
          title={props.title}
          sources={sources}
          replacementStrings={rs}
          className={"histogram-chart"}
          allowEmbed={false}
        >
          <div id={props.id} className="svg-container" ref={svgContainer}></div>
        </ChartTileContainer>
      )}
    </>
  );

  /**
   * Bin dates and values to plot based on given disasterEventPoints.
   */
  function processData(
    disasterEventPoints: DisasterEventPoint[],
    dateSetting: string,
    setHistogramData: (data: DataPoint[]) => void
  ): void {
    // TODO(juliawu): detect whether to bin by month or day depending on the
    //                user's selected time setting
    // TODO(juliawu): add 'last30days' case handling
    const histogramData = binDataByMonth(disasterEventPoints, dateSetting);
    setHistogramData(histogramData);
  }

  /**
   * Plot the histogram in the DOM element.
   */
  function renderHistogram(
    props: HistogramTilePropType,
    histogramData: DataPoint[]
  ): void {
    const elem = document.getElementById(props.id);
    elem.innerHTML = "";
    drawHistogram(props.id, elem.clientWidth, elem.clientHeight, histogramData);
  }
}
