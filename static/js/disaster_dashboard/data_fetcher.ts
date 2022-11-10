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
 * Functions that return promises for data needed for disaster dashbaord
 */

import axios from "axios";

import { GeoJsonData } from "../chart/types";
import { DISASTER_EVENT_INTENSITIES, DISASTER_EVENT_TYPES } from "./constants";
import { DisasterApiEventPoint, DisasterEventPoint, DisasterType } from "./types";

const MAX_DATES = 100;

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
 * Get promise for date list
 * @param disasterType the disaster type to get date list for
 */
export function fetchDateList(disasterType: DisasterType): Promise<string[]> {
  const promises = [];
  const disasterTypesToFetch =
    disasterType === DisasterType.ALL
      ? Object.keys(DISASTER_EVENT_TYPES)
      : [disasterType];
  for (const disasterType of disasterTypesToFetch) {
    DISASTER_EVENT_TYPES[disasterType].forEach((eventType) => {
      promises.push(
        axios
          .get<{ minDate: string, maxDate: string }>("/api/disaster-dashboard/date-range", {
            params: {
              eventType,
            },
          })
          .then((resp) => resp.data)
      );
    });
  }
  return Promise.all(promises).then((resp) => {
    let minDate = "";
    let maxDate = "";
    resp.forEach((dateRange) => {
      if (dateRange.minDate) {
        if (!minDate || dateRange.minDate < minDate) {
          minDate = dateRange.minDate;
        }
        if (!maxDate || dateRange.minDate > maxDate) {
          maxDate = dateRange.maxDate;
        }
      }
      if (!maxDate || dateRange.maxDate > maxDate) {
        maxDate = dateRange.maxDate;
      }
    });
    if (!minDate && !maxDate) {
      return [];
    }
    let decrementByYear = false;
    if (
      new Date(maxDate).getFullYear() - new Date(minDate).getFullYear() >
      MAX_DATES
    ) {
      decrementByYear = true;
    }
    const dateList = [];
    const currDate = new Date(maxDate);
    const endDate = new Date(minDate);
    while (currDate >= endDate) {
      const stringCut = decrementByYear ? 4 : 7;
      dateList.push(currDate.toISOString().substring(0, stringCut));
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
 * Get promise for event points for a specific event type, place, and date
 * @param eventType event type to get data for
 * @param place place to get data for
 * @param date date to get data for (YYYY-MM)
 * @param disasterType disaster type that the event type belongs to
 */
function fetchEventTypeData(
  eventType: string,
  place: string,
  date: string,
  disasterType: DisasterType
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
        if (disasterType in DISASTER_EVENT_INTENSITIES) {
          for (const prop of DISASTER_EVENT_INTENSITIES[disasterType]) {
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
 * Get promise for all event points for a specific disaster type, place, and date
 * @param disasterType disaster type to get data for
 * @param place place to get data for
 * @param date date to get data for (can be YYYY or YYYY-MM)
 */
export function fetchDisasterData(
  disasterType: DisasterType,
  place: string,
  date: string
): Promise<DisasterEventPoint[]> {
  // Dates to fetch data for. If date argument is a year, we want to fetch data
  // for every month in that year.
  const dates = [];
  if (date.length === 4) {
    for (let i = 1; i < 13; i++) {
      dates.push(`${date}-${i < 10 ? "0" : ""}${i}`);
    }
  } else if (date.length === 7) {
    dates.push(date);
  }
  const eventTypeToDisasterType = {};
  for (const dType in DISASTER_EVENT_TYPES) {
    if (disasterType !== DisasterType.ALL && dType !== disasterType) {
      continue;
    }
    DISASTER_EVENT_TYPES[dType].forEach((eventType) => {
      eventTypeToDisasterType[eventType] = dType;
    });
  }
  const promises = [];
  for (const eventType of Object.keys(eventTypeToDisasterType)) {
    for (const date of dates) {
      const disasterType = eventTypeToDisasterType[eventType];
      promises.push(fetchEventTypeData(eventType, place, date, disasterType));
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
