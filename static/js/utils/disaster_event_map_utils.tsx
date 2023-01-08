/**
 * Copyright 2022 Google LLC
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
 * Util functions used for disaster event map.
 */

import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";

import { GeoJsonData } from "../chart/types";
import { DisasterEventMapInfoCard } from "../components/tiles/disaster_event_map_info_card";
import {
  EUROPE_NAMED_TYPED_PLACE,
  IPCC_PLACE_50_TYPE_DCID,
} from "../shared/constants";
import { NamedPlace, NamedTypedPlace } from "../shared/types";
import { getAllChildPlaceTypes, getParentPlaces } from "../tools/map/util";
import {
  DisasterEventDataApiResponse,
  DisasterEventPoint,
  DisasterEventPointData,
} from "../types/disaster_event_map_types";
import {
  EventTypeSpec,
  SeverityFilter,
} from "../types/subject_page_proto_types";
import { isValidDate } from "./string_utils";

const MAX_YEARS = 20;
const INFO_CARD_OFFSET = 5;

/**
 * Get promise for geojson data
 * @param selectedPlace the enclosing place to get geojson data for
 * @param placeType the place type to get geojson data for
 */
export function fetchGeoJsonData(
  selectedPlace: string,
  placeType: string
): Promise<GeoJsonData> {
  return axios
    .get<GeoJsonData>("/api/choropleth/geojson", {
      params: {
        placeDcid: selectedPlace,
        placeType: placeType,
      },
    })
    .then((resp) => resp.data as GeoJsonData);
}

/**
 * Get a list of dates that encompass all events for a place and a given list of event types
 * @param eventTypeDcids the list of event types to get dates for
 * @param place the dcid of the affected place to get event dates for
 */
export function fetchDateList(
  eventTypeDcids: string[],
  place: string
): Promise<string[]> {
  if (_.isEmpty(place)) {
    return Promise.resolve([]);
  }
  const promises = eventTypeDcids.map((eventType) => {
    return axios
      .get<{ minDate: string; maxDate: string }>(
        "/api/disaster-dashboard/event-date-range",
        {
          params: {
            eventType,
            place,
          },
        }
      )
      .then((resp) => resp.data);
  });

  return Promise.all(promises).then((resp) => {
    // minDate and maxDate for the disaster type (i.e., min and max of all the
    // eventTypes of this disaster type)
    let minDate = "";
    let maxDate = "";
    resp.forEach((dateRange) => {
      // dateRange is the min and max dates for a single eventType.
      if (
        isValidDate(dateRange.minDate) &&
        (!minDate || dateRange.minDate < minDate)
      ) {
        minDate = dateRange.minDate;
      }
      if (
        isValidDate(dateRange.maxDate) &&
        (!maxDate || dateRange.maxDate > maxDate)
      ) {
        maxDate = dateRange.maxDate;
      }
    });
    if (!minDate && !maxDate) {
      return [];
    }
    const decrementByYear =
      new Date(maxDate).getFullYear() - new Date(minDate).getFullYear() >
      MAX_YEARS;
    const dateList = [];
    const currDate = new Date(maxDate);
    const endDate = new Date(minDate);
    const dateStringCut = decrementByYear ? 4 : 7;
    while (currDate >= endDate) {
      // currDate is in local time but toISOString will get the iso string of the
      // date in UTC. So first we need to convert currDate to UTC date without
      // changing the date.
      const utcDate = new Date(currDate.toLocaleDateString() + " UTC");
      dateList.push(utcDate.toISOString().substring(0, dateStringCut));
      if (decrementByYear) {
        currDate.setFullYear(currDate.getFullYear() - 1);
      } else {
        currDate.setMonth(currDate.getMonth() - 1);
      }
    }
    return dateList;
  });
}

/**
 * Get event points for a specific event type, place, and date
 * @param eventType event type to get data for
 * @param place place to get data for
 * @param date date used for data retrieval (YYYY-MM)
 * @param disasterType the disaster type that the event type belongs to
 * @param severityProps list of severity props to get data about
 * @param minDate a finer granularity date (than the date used for data retrieval)
 *                to use as a min date of returned event points.
 * @param maxDate a finer granularity date (than the date used for data retrieval)
 *                to use as a max date of returned event points.
 */
function fetchEventPoints(
  eventType: string,
  place: string,
  date: string,
  disasterType: string,
  severityFilter?: SeverityFilter,
  minDate?: string,
  maxDate?: string
): Promise<DisasterEventPointData> {
  const reqParams = {
    eventType: eventType,
    place: place,
    date: date,
  };
  if (severityFilter) {
    reqParams["filterProp"] = severityFilter.prop;
    reqParams["filterUnit"] = severityFilter.unit;
    reqParams["filterUpperLimit"] = severityFilter.upperLimit;
    reqParams["filterLowerLimit"] = severityFilter.lowerLimit;
  }
  return axios
    .get<DisasterEventDataApiResponse>("/api/disaster-dashboard/event-data", {
      params: reqParams,
    })
    .then((resp) => {
      const result = {
        eventPoints: [],
        provenanceInfo: {},
      };
      const eventCollection = resp.data.eventCollection;
      if (_.isEmpty(eventCollection) || _.isEmpty(eventCollection.events)) {
        return result;
      }
      result.provenanceInfo = eventCollection.provenanceInfo;
      eventCollection.events.forEach((eventData) => {
        if (
          _.isEmpty(eventData.geoLocations) ||
          _.isEmpty(eventData.geoLocations[0].point)
        ) {
          return;
        }
        if (
          eventData.dates[0] < minDate ||
          eventData.dates[0].substring(0, maxDate.length) > maxDate
        ) {
          return;
        }
        const severity = {};
        if (severityFilter && severityFilter.prop in eventData.propVals) {
          const severityVals = eventData.propVals[severityFilter.prop].vals;
          if (!_.isEmpty(severityVals)) {
            // Get value by taking the first severity val, trimming the unit
            // from the string, and converting it into a number.
            const unit = severityFilter.unit || "";
            const val = Number(severityVals[0].substring(unit.length));
            if (!isNaN(val)) {
              severity[severityFilter.prop] = val;
            }
          }
        }
        const name =
          !_.isEmpty(eventData.propVals.name) &&
          !_.isEmpty(eventData.propVals.name.vals)
            ? eventData.propVals.name.vals[0]
            : eventData.dcid;
        const endDate =
          !_.isEmpty(eventData.propVals.endDate) &&
          !_.isEmpty(eventData.propVals.endDate.vals)
            ? eventData.propVals.endDate.vals[0]
            : "";
        result.eventPoints.push({
          placeDcid: eventData.dcid,
          placeName: name,
          latitude: eventData.geoLocations[0].point.latitude,
          longitude: eventData.geoLocations[0].point.longitude,
          disasterType,
          startDate: !_.isEmpty(eventData.dates) ? eventData.dates[0] : "",
          severity,
          endDate,
          provenanceId: eventData.provenanceId,
        });
      });
      return result;
    });
}

/**
 * Get all event points for a place, date range, and list of event specs. Only dates of type YYYY, YYYY-MM, or YYYY-MM-DD are supported.
 * @param eventSpecs list of eventSpecs to get data for
 * @param place containing place to get data for
 * @param dateRange list of [minDate, maxDate] where minDate and maxDate are the
 *                  same length and of the format YYYY, YYYY-MM, or YYYY-MM-DD
 * @param severityFilters map of event spec id to severity filter to use for
 *                        that event type
 */
export function fetchDisasterEventPoints(
  eventSpecs: EventTypeSpec[],
  place: string,
  dateRange: [string, string],
  severityFilters: Record<string, SeverityFilter>
): Promise<DisasterEventPointData> {
  // Dates to fetch data for.
  const dates = [];
  const minYear = dateRange[0].substring(0, 4);
  const maxYear = dateRange[1].substring(0, 4);
  // The minimum length of a date string from dates in the dateRange and dates
  // used for data retrieval. Dates used for data retrieval are YYYY-MM.
  const minDateLength = Math.min(dateRange[0].length, 7);
  // Loop through every YYYY-MM date between minYear-01 and maxYear-12 and add
  // all dates that are within the dateRange.
  for (let year = Number(minYear); year <= Number(maxYear); year++) {
    for (let month = 1; month <= 12; month++) {
      const date = `${year.toString()}-${month.toString().padStart(2, "0")}`;
      if (
        date.substring(0, minDateLength) <
        dateRange[0].substring(0, minDateLength)
      ) {
        continue;
      }
      if (
        date.substring(0, minDateLength) >
        dateRange[1].substring(0, minDateLength)
      ) {
        break;
      }
      dates.push(date);
    }
  }
  const promises = [];
  for (const eventSpec of eventSpecs) {
    for (const eventType of eventSpec.eventTypeDcids) {
      for (const date of dates) {
        promises.push(
          fetchEventPoints(
            eventType,
            place,
            date,
            eventSpec.id,
            severityFilters[eventSpec.id],
            dateRange[0].length > 7 ? dateRange[0] : "",
            dateRange[1].length > 7 ? dateRange[1] : ""
          )
        );
      }
    }
  }
  return Promise.all(promises).then((resp) => {
    const eventPoints = [];
    const provenanceInfo = {};
    resp.forEach((eventTypeResp) => {
      eventPoints.push(...eventTypeResp.eventPoints);
      Object.assign(provenanceInfo, eventTypeResp.provenanceInfo);
    });
    return { eventPoints, provenanceInfo };
  });
}

/**
 * Returns whether or not a place on the map can be clicked
 * @param newPlace the place to check whether or not it can be clicked
 * @param mapPlace the place the map is shown for
 * @param mapPlaceParentPlaces parent places of the mapPlace
 * @param europeanCountries list of european countries
 */
export function canClickRegion(
  newPlace: NamedTypedPlace,
  mapPlace: NamedTypedPlace,
  mapPlaceParentPlaces: NamedPlace[],
  europeanCountries: NamedPlace[]
): boolean {
  // If a country is a European country, we want to add Europe to its list
  // of parents when calling getParentPlaces. This is important for
  // getAllChildPlaceTypes because it will handle European countries
  // differently than regular countries.
  const enclosingPlace =
    europeanCountries.findIndex((country) => country.dcid === newPlace.dcid) >
    -1
      ? EUROPE_NAMED_TYPED_PLACE
      : mapPlace;
  const parentPlaces = getParentPlaces(
    mapPlace,
    enclosingPlace,
    mapPlaceParentPlaces
  );
  return !_.isEmpty(
    getAllChildPlaceTypes(newPlace, parentPlaces).filter(
      (placeType) =>
        placeType !== IPCC_PLACE_50_TYPE_DCID &&
        newPlace.types.findIndex((newPlaceType) => newPlaceType === placeType) <
          0
    )
  );
}

/**
 * Callback function when a point on a disaster event map is clicked.
 * @param infoCardElement The element to render an info card in
 * @param svgContainerElement The element the map is drawn in
 * @param point The point that was clicked
 * @param event The pointer event when click occurred
 */
export function onPointClicked(
  infoCardElement: HTMLDivElement,
  svgContainerElement: HTMLDivElement,
  point: DisasterEventPoint,
  event: PointerEvent
): void {
  const infoCard = d3.select(infoCardElement);
  ReactDOM.render(
    <DisasterEventMapInfoCard
      onClose={() => d3.select(infoCardElement).style("visibility", "hidden")}
      eventData={point}
    />,
    infoCardElement
  );
  // get info card dimensions
  const infoCardRect = (
    infoCard.node() as HTMLDivElement
  ).getBoundingClientRect();
  const infoCardHeight = infoCardRect.height;
  const infoCardWidth = infoCardRect.width;
  const containerWidth = (
    d3.select(svgContainerElement).node() as HTMLDivElement
  ).getBoundingClientRect().width;
  // calculate left and top position to show the info card
  let left = Math.min(event.offsetX, containerWidth - infoCardWidth);
  if (left < 0) {
    left = 0;
    infoCard.style("width", containerWidth + "px");
  } else {
    infoCard.style("width", "fit-content");
  }
  let top = event.offsetY - infoCardHeight - INFO_CARD_OFFSET;
  if (top < 0) {
    top = event.offsetY + INFO_CARD_OFFSET;
  }
  // set info card position and make it visible
  infoCard
    .style("left", left + "px")
    .style("top", top + "px")
    .style("visibility", "visible");
}
