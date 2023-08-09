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
import React, { memo, useCallback, useRef } from "react";

import { DataPoint } from "../../chart/base";
import { drawHistogram } from "../../chart/draw_histogram";
import { DATE_OPTION_30D_KEY } from "../../constants/disaster_event_map_constants";
import { NamedTypedPlace } from "../../shared/types";
import {
  DisasterEventPoint,
  DisasterEventPointData,
} from "../../types/disaster_event_map_types";
import { EventTypeSpec } from "../../types/subject_page_proto_types";
import { getDateRange } from "../../utils/disaster_event_map_utils";
import { stripUnitFromPropertyValue } from "../../utils/property_value_utils";
import { ReplacementStrings } from "../../utils/tile_utils";
import { ChartTileContainer } from "./chart_tile";
import { useDrawOnResize } from "./use_draw_on_resize";

interface HistogramTilePropType {
  disasterEventData: DisasterEventPointData;
  eventTypeSpec: EventTypeSpec;
  id: string;
  place: NamedTypedPlace;
  property: string;
  selectedDate: string;
  title: string;
  showExploreMore?: boolean;
}

const DAY_FORMAT = "YYYY-MM-DD";
const MONTH_FORMAT = "YYYY-MM";
const YEAR_FORMAT = "YYYY";
const EXPLORE_MORE_BASE_URL = "/disasters/";

/**
 * Helper function to get the date portion of a Date object as a string.
 * @param date a Date() object to format
 * @param format ISO 8601 format to follow
 */
function getFormattedDate(date: Date, format: string): string {
  return date.toISOString().slice(0, format.length);
}

/**
 * Helper function to get the last date of a YYYY-MM string.
 * For example, given "2003-02", return "2003-02-28".
 * @param dateString date in YYYY-MM format to get last day for
 */
function getLastDayOfMonth(dateString: string): string {
  const inputDate = new Date(Date.parse(dateString));
  const lastDay = new Date(
    inputDate.getUTCFullYear(),
    inputDate.getUTCMonth() + 1,
    0
  );
  return lastDay.toISOString().slice(0, "YYYY-MM-DD".length);
}

/**
 * Get the earliest and latest date in YYYY-MM-DD to show data for.
 * Used for getting the dates to use as labels along the x-axis.
 * @param dateSetting user selected date setting
 */
function getLabelBounds(dateSetting: string): [string, string] {
  // get start and end of dates to show data for
  let [startDate, endDate] = getDateRange(dateSetting);

  // specify full dates if start and end dates are just YYYY or YYYY-MM
  if (
    startDate.length == YEAR_FORMAT.length &&
    endDate.length == YEAR_FORMAT.length
  ) {
    startDate = `${startDate}-01-01`;
    endDate = `${endDate}-12-31`;
  } else if (
    startDate.length == MONTH_FORMAT.length &&
    endDate.length == MONTH_FORMAT.length
  ) {
    startDate = `${startDate}-01`;
    endDate = `${getLastDayOfMonth(endDate)}`;
  }
  return [startDate, endDate];
}

/**
 * Helper function for getting all days along x-axis to display.
 * Used for initializing bins when binning daily.
 * @param dateSetting user selected date setting
 */
function getDaysArray(dateSetting: string): string[] {
  const [startDate, endDate] = getLabelBounds(dateSetting);

  // Fill in days between start and end dates
  const days = new Array<string>();
  for (
    let date = new Date(Date.parse(startDate));
    getFormattedDate(date, DAY_FORMAT) <=
    getFormattedDate(new Date(Date.parse(endDate)), DAY_FORMAT);
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    days.push(getFormattedDate(new Date(date), DAY_FORMAT));
  }
  return days;
}

/**
 * Helper function for getting all months along x-axis to display.
 * Used for initializing bins when binning monthly.
 * @param dateSetting user selected date setting
 */
function getMonthsArray(dateSetting: string): string[] {
  const [startDate, endDate] = getLabelBounds(dateSetting);
  // Fill in months between start and end dates
  const months = new Array<string>();
  for (
    let date = new Date(Date.parse(startDate));
    getFormattedDate(date, MONTH_FORMAT) <=
    getFormattedDate(new Date(Date.parse(endDate)), MONTH_FORMAT);
    date.setMonth(date.getMonth() + 1)
  ) {
    months.push(getFormattedDate(new Date(date), MONTH_FORMAT));
  }
  return months;
}

/**
 * Helper function for binning data.
 * @param disasterEventPoints event data points to bin
 * @param dateSetting user selected date setting
 * @param format temporal granularity to use. One of "YYYY-MM" or "YYYY-MM-DD"
 * @param property the property to bin values for. Defaults to aggregating
 *                 counts if property is undefined.
 */
function binData(
  disasterEventPoints: DisasterEventPoint[],
  dateSetting: string,
  format: string,
  property?: string
): DataPoint[] {
  if (_.isEmpty(disasterEventPoints)) {
    return [];
  }

  // Track date -> number of events
  const bins = new Map<string, number>();

  // Initialize all bins at zero
  const datesToPlot =
    format == DAY_FORMAT
      ? getDaysArray(dateSetting)
      : getMonthsArray(dateSetting);
  for (const date of datesToPlot) {
    bins.set(date, 0);
  }

  for (const event of disasterEventPoints) {
    // Get start time in the temporal granularity desired
    const eventDate = event.startDate.slice(0, format.length);

    // Get value of property to aggregate
    let eventValue = 1;
    if (property && event.displayProps) {
      // Default to 0 if property can't be found in display props
      const propertyValueString = event.displayProps[property];
      eventValue = propertyValueString
        ? stripUnitFromPropertyValue(propertyValueString)
        : 0;
    }

    // Increment value in corresponding bin if event has at least
    // that temporal granularity
    if (bins.has(eventDate) && eventDate.length == format.length) {
      bins.set(eventDate, bins.get(eventDate) + eventValue);
    } else {
      console.log(`Skipped event ${event} that started on ${eventDate}`);
    }
  }

  // Return [] if we skipped every event.
  if (Array.from(bins.values()).every((value) => value == 0)) {
    console.log(
      "[Histogram] Skipped plotting all events. Either the events were not " +
        "within the provided time frame, the events did not have at least " +
        `${format} temporal resolution, or the event_type_spec is missing a ` +
        `display_prop entry for ${property}.`
    );
    return [];
  }

  // Format binned data into DataPoint[]
  const histogramData = new Array<DataPoint>();
  bins.forEach((value, label) => {
    histogramData.push({ label, value });
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
export const HistogramTile = memo(function HistogramTile(
  props: HistogramTilePropType
): JSX.Element {
  const svgContainer = useRef(null);
  const isInitialLoading = _.isNull(props.disasterEventData);
  let histogramData = [];
  if (!isInitialLoading && !_.isEmpty(props.disasterEventData)) {
    histogramData = getHistogramData(
      props.disasterEventData.eventPoints,
      props.selectedDate,
      props.property
    );
  }

  const drawFn = useCallback(() => {
    if (!shouldShowHistogram) {
      return;
    }
    renderHistogram(props, histogramData);
  }, [props, histogramData]);

  useDrawOnResize(drawFn, svgContainer.current);

  // for title formatting
  const rs: ReplacementStrings = {
    placeName: props.place.name,
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

  if (!isInitialLoading && !shouldShowHistogram(histogramData)) {
    return <></>;
  }

  // TODO (juliawu): add "sorry, we don't have data" message if data is
  //                 present at 6 months but not 30 days
  return (
    <ChartTileContainer
      id={props.id}
      title={props.title}
      sources={sources}
      replacementStrings={rs}
      className={"histogram-chart"}
      allowEmbed={false}
      isInitialLoading={isInitialLoading}
      exploreMoreUrl={
        props.showExploreMore
          ? `${EXPLORE_MORE_BASE_URL}${props.place.dcid}`
          : ""
      }
    >
      <div id={props.id} className="svg-container" ref={svgContainer}></div>
    </ChartTileContainer>
  );

  /**
   * Bin dates and values to plot based on given disasterEventPoints.
   * @param disasterEventPoints event data to process
   * @param dateSetting the date option selected by the user
   * @param property the property to bin values for. Defaults to aggregating
   *                 counts if property is undefined.
   */
  function getHistogramData(
    disasterEventPoints: DisasterEventPoint[],
    dateSetting: string,
    property?: string
  ): DataPoint[] {
    let histogramData: DataPoint[] = [];
    // Try binning by day if dateSetting is "last 30 days" or a month
    if (
      dateSetting == DATE_OPTION_30D_KEY ||
      dateSetting.length == MONTH_FORMAT.length
    ) {
      histogramData = binData(
        disasterEventPoints,
        dateSetting,
        DAY_FORMAT,
        property
      );
    }
    // Bin by month for all other cases
    // Also fallback to monthly binning if daily binning returns no data
    if (_.isEmpty(histogramData)) {
      histogramData = binData(
        disasterEventPoints,
        dateSetting,
        MONTH_FORMAT,
        property
      );
    }
    return histogramData;
  }

  /**
   * Plot the histogram in the DOM element.
   */
  function renderHistogram(
    props: HistogramTilePropType,
    histogramData: DataPoint[]
  ): void {
    // Get unit to display on y-axis, if available
    let unit = undefined;
    if (props.property) {
      const eventDisplayProp = props.eventTypeSpec.displayProp.find(
        (elem) => elem.prop == props.property
      );
      unit = eventDisplayProp.unit;
    }

    const elem = document.getElementById(props.id);
    if (elem) {
      elem.innerHTML = "";
      drawHistogram(
        props.id,
        elem.clientWidth,
        elem.clientHeight,
        histogramData,
        {
          fillColor: props.eventTypeSpec.color,
          unit,
        }
      );
    }
  }
});
