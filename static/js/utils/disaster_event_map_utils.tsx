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
  DisasterApiEventPoint,
  DisasterEventPoint,
} from "../types/disaster_event_map_types";
import { EventTypeSpec } from "../types/subject_page_proto_types";

const MAX_YEARS = 20;
const iNFO_CARD_OFFSET = 5;

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
 * Get a list of dates that encompass all events for a given list of event types
 * @param eventTypeDcids the list of event types to get dates for
 */
export function fetchDateList(eventTypeDcids: string[]): Promise<string[]> {
  const promises = eventTypeDcids.map((eventType) => {
    return axios
      .get<{ minDate: string; maxDate: string }>(
        "/api/disaster-dashboard/date-range",
        {
          params: {
            eventType,
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
      if (dateRange.minDate && (!minDate || dateRange.minDate < minDate)) {
        minDate = dateRange.minDate;
      }
      if (dateRange.maxDate && (!maxDate || dateRange.maxDate > maxDate)) {
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
 * @param date date to get data for (YYYY-MM)
 * @param disasterType the disaster type that the event type belongs to
 * @param disasterEventIntensities map of disasterTypeId to list of intensity props to use for that disaster type
 */
function fetchEventTypeData(
  eventType: string,
  place: string,
  date: string,
  disasterType: string,
  disasterEventIntensities?: Record<string, string[]>
): Promise<DisasterEventPoint[]> {
  return axios
    .get<DisasterApiEventPoint[]>("/api/disaster-dashboard/data", {
      params: {
        eventType: eventType,
        place: place,
        date: date,
      },
    })
    .then((resp) => {
      const result = [];
      resp.data.forEach((eventData) => {
        const intensity = {};
        if (
          disasterEventIntensities &&
          disasterType in disasterEventIntensities
        ) {
          for (const prop of disasterEventIntensities[disasterType]) {
            if (prop in eventData) {
              intensity[prop] = eventData[prop];
            }
          }
        }
        result.push({
          placeDcid: eventData.eventId,
          placeName: eventData.name || eventData.eventId,
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          disasterType,
          startDate: eventData.startDate,
          intensity,
          endDate: eventData.endDate,
        });
      });
      return result;
    });
}

/**
 * Get all event points for a place, date, and list of event specs. Only dates of type YYYY or YYYY-MM are supported.
 * @param eventSpecs list of eventSpecs to get data for
 * @param place containing place to get data for
 * @param date date with format YYYY or YYYY-MM to get data for
 * @param disasterEventIntensities map of disasterTypeId to list of intensity props to use for that disaster type
 */
export function fetchDisasterEventPoints(
  eventSpecs: EventTypeSpec[],
  place: string,
  date: string,
  disasterEventIntensities?: Record<string, string[]>
): Promise<DisasterEventPoint[]> {
  // Dates to fetch data for. If date argument is a year, we want to fetch data
  // for every month in that year.
  const dates = [];
  if (date.length === 4) {
    for (let i = 1; i <= 12; i++) {
      dates.push(`${date}-${i.toString().padStart(2, "0")}`);
    }
  } else if (date.length === 7) {
    dates.push(date);
  }
  const promises = [];
  for (const eventSpec of eventSpecs) {
    for (const eventType of eventSpec.eventTypeDcids) {
      for (const date of dates) {
        promises.push(
          fetchEventTypeData(
            eventType,
            place,
            date,
            eventSpec.id,
            disasterEventIntensities
          )
        );
      }
    }
  }
  return Promise.all(promises).then((resp) => {
    let result = [];
    resp.forEach((eventTypeResp) => {
      result = result.concat(eventTypeResp);
    });
    return result;
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
  let top = event.offsetY - infoCardHeight - iNFO_CARD_OFFSET;
  if (top < 0) {
    top = event.offsetY + iNFO_CARD_OFFSET;
  }
  // set info card position and make it visible
  infoCard
    .style("left", left + "px")
    .style("top", top + "px")
    .style("visibility", "visible");
}
