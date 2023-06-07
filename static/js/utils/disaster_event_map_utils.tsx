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
import rewind from "geojson-rewind";
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";

import { DisasterEventMapInfoCard } from "../components/tiles/disaster_event_map_info_card";
import {
  DATE_OPTION_1Y_KEY,
  DATE_OPTION_6M_KEY,
  DATE_OPTION_30D_KEY,
  URL_HASH_PARAM_KEYS,
} from "../constants/disaster_event_map_constants";
import {
  EUROPE_NAMED_TYPED_PLACE,
  IPCC_PLACE_50_TYPE_DCID,
} from "../shared/constants";
import { NamedPlace, NamedTypedPlace } from "../shared/types";
import { getAllChildPlaceTypes, getParentPlaces } from "../tools/map/util";
import {
  DisasterDataOptions,
  DisasterEventDataApiResponse,
  DisasterEventPoint,
  DisasterEventPointData,
  MapPointsData,
} from "../types/disaster_event_map_types";
import {
  EventTypeSpec,
  SeverityFilter,
} from "../types/subject_page_proto_types";
import { isValidDate } from "./string_utils";

const MAX_YEARS = 20;
const INFO_CARD_OFFSET = 5;
const DATE_SUBSTRING_IDX = 10;
const REWIND_GEOJSON_TYPES = new Set(["Polygon", "MultiPolygon"]);

/**
 * Get a list of dates that encompass all events for a place and a given list of event types
 * @param eventTypeDcids the list of event types to get dates for
 * @param place the dcid of the affected place to get event dates for
 */
export function fetchDateList(
  eventTypeDcids: string[],
  place: string,
  useCache?: boolean
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
            useCache: useCache ? "1" : "0",
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
    const increaseByYear =
      new Date(maxDate).getFullYear() - new Date(minDate).getFullYear() >
      MAX_YEARS;
    const dateList = [];
    const dateStringCut = increaseByYear ? 4 : 7;
    // When creating the Date object, a date-only string will be interpretted as
    // UTC. Necessary because toISOString() gets the iso string of the
    // date in UTC.
    const currDate = new Date(minDate);
    const endDate = new Date(maxDate);
    // Need to generate the list of dates from min -> max because otherwise,
    // dates may get skipped or duplicated.
    while (currDate <= endDate) {
      const dateString = currDate.toISOString().substring(0, dateStringCut);
      dateList.push(dateString);
      if (increaseByYear) {
        currDate.setUTCFullYear(currDate.getUTCFullYear() + 1);
      } else {
        currDate.setUTCMonth(currDate.getUTCMonth() + 1);
      }
    }
    // If end date wasn't added to the dateList, add it now
    const endDateString = endDate.toISOString().substring(0, dateStringCut);
    if (!_.isEmpty(dateList) && _.last(dateList) < endDateString) {
      dateList.push(endDateString);
    }
    return dateList.reverse();
  });
}

/**
 * Parses the first value of returned values from the event API, parsed as a number.
 * @param values Values to extract.
 * @param unit Unit to parse out.
 * @param reqParams Object to use for logging if there is an error.
 */
function parseEventPropVal(
  values: string[],
  unit: string,
  reqParams?: any
): number {
  if (!_.isEmpty(values)) {
    // Get value by taking the first val, trimming the unit from the string, and
    // converting it into a number.
    console.assert(
      values[0].length > unit.length,
      "event values do not contain unit, please check filter config, %o",
      reqParams
    );
    return Number(values[0].substring(unit.length));
  }
  return Number.NaN;
}

/**
 * Gets the geojson feature from a record of propvals
 * @param eventDcid the dcid of the event to get the geojson feature for
 * @param geoJsonProp the prop to get the geojson feature from
 * @param propVals a record of props to vals for the eventDcid event
 */
function getGeoJsonFeature(
  eventDcid: string,
  geoJsonProp: string,
  propVals: { [prop: string]: { vals: string[] } }
) {
  let geoJson = null;
  if (propVals[geoJsonProp] && !_.isEmpty(propVals[geoJsonProp].vals)) {
    // Remove any extra backslashes that that are in the prop val string.
    // e.g., cyclone geojsons vals look like "{\\\"type\\\": ...}" which causes
    //       JSON.parse to throw an error. We just  want "{\"type\": ...}"
    const geoJsonString = propVals[geoJsonProp].vals[0].replace(/(\\)+"/g, '"');
    let geoJsonGeo = JSON.parse(geoJsonString);
    if (REWIND_GEOJSON_TYPES.has(geoJsonGeo.type)) {
      geoJsonGeo = rewind(geoJsonGeo, true);
    }
    geoJson = {
      type: "Feature",
      id: eventDcid,
      properties: { name: eventDcid, geoDcid: eventDcid },
      geometry: geoJsonGeo,
    };
  }
  return geoJson;
}

/**
 * Get event points for a specific event type, place, and date. Events are
 * processed to only include required data based on the config.
 * @param eventType event type to get data for
 * @param place place to get data for
 * @param dateRange Dates to use for data retrieval (YYYY-MM), [start,end]
 * @param eventTypeSpec The event type spec that this event type belongs to
 * @param severityFilter Severity props to get data about
 * @param useCache If true, uses data from the event cache (otherwise uses JSON cache).
 */
function fetchEventPoints(
  eventType: string,
  place: string,
  dateRange: [string, string],
  eventTypeSpec: EventTypeSpec,
  severityFilter?: SeverityFilter,
  useCache?: boolean
): Promise<DisasterEventPointData> {
  const reqParams = {
    eventType,
    place,
    minDate: dateRange[0],
    maxDate: dateRange[1],
  };
  if (severityFilter) {
    reqParams["filterProp"] = severityFilter.prop;
    reqParams["filterUnit"] = severityFilter.unit;
    reqParams["filterUpperLimit"] = severityFilter.upperLimit;
    reqParams["filterLowerLimit"] = severityFilter.lowerLimit;
  }
  const url = useCache
    ? "/api/disaster-dashboard/event-data"
    : "/api/disaster-dashboard/json-event-data";
  return axios
    .get<DisasterEventDataApiResponse>(url, { params: reqParams })
    .then((resp) => {
      const result = {
        eventPoints: [],
        provenanceInfo: {},
      };
      const eventCollection = resp.data.eventCollection;
      if (_.isEmpty(eventCollection) || _.isEmpty(eventCollection.events)) {
        return result;
      }
      const seenEvents = new Set();
      result.provenanceInfo = eventCollection.provenanceInfo;
      eventCollection.events.forEach((eventData) => {
        if (
          _.isEmpty(eventData.geoLocations) ||
          _.isEmpty(eventData.geoLocations[0].point) ||
          seenEvents.has(eventData.dcid)
        ) {
          return;
        }
        const severity = {};
        if (severityFilter && severityFilter.prop in eventData.propVals) {
          const severityVals = eventData.propVals[severityFilter.prop].vals;
          const val = parseEventPropVal(
            severityVals,
            severityFilter.unit || "",
            reqParams
          );
          if (!isNaN(val)) {
            severity[severityFilter.prop] = val;
          }
        }
        const displayProps = {};
        if (eventTypeSpec.displayProp) {
          for (const dp of eventTypeSpec.displayProp) {
            if (dp.prop in eventData.propVals) {
              if (!_.isEmpty(eventData.propVals[dp.prop].vals)) {
                const val = eventData.propVals[dp.prop].vals[0];
                if (val) {
                  displayProps[dp.prop] = val;
                }
              }
            }
          }
        }
        const name =
          !_.isEmpty(eventData.propVals.name) &&
          !_.isEmpty(eventData.propVals.name.vals)
            ? eventData.propVals.name.vals[0]
            : eventData.dcid;
        let endDate = "";
        for (const prop of eventTypeSpec.endDateProp || []) {
          if (
            prop in eventData.propVals &&
            !_.isEmpty(eventData.propVals[prop].vals)
          ) {
            endDate = eventData.propVals[prop].vals[0];
            break;
          }
        }
        const polygonGeoJson = getGeoJsonFeature(
          eventData.dcid,
          eventTypeSpec.polygonGeoJsonProp || "",
          eventData.propVals
        );
        const pathGeoJson = getGeoJsonFeature(
          eventData.dcid,
          eventTypeSpec.pathGeoJsonProp || "",
          eventData.propVals
        );
        result.eventPoints.push({
          placeDcid: eventData.dcid,
          placeName: name,
          latitude: eventData.geoLocations[0].point.latitude,
          longitude: eventData.geoLocations[0].point.longitude,
          disasterType: eventTypeSpec.id,
          startDate: !_.isEmpty(eventData.dates) ? eventData.dates[0] : "",
          severity,
          displayProps,
          endDate,
          provenanceId: eventData.provenanceId,
          affectedPlaces: eventData.places || [],
          polygonGeoJson,
          pathGeoJson,
        });
        seenEvents.add(eventData.dcid);
      });
      return result;
    })
    .catch(() => {
      return {
        eventPoints: [],
        provenanceInfo: {},
      };
    });
}

/**
 * Gets special date ranges that are based off the current date.
 */
function getCustomDateRanges(): { [dateKey: string]: [string, string] } {
  const currentDate = new Date();
  const minus30Days = new Date(new Date().setDate(currentDate.getDate() - 30));
  const minus6Months = new Date(
    new Date().setMonth(currentDate.getMonth() - 6)
  );
  const minus1Year = new Date(
    new Date().setFullYear(currentDate.getFullYear() - 1)
  );
  return {
    [DATE_OPTION_30D_KEY]: [
      minus30Days.toISOString().substring(0, DATE_SUBSTRING_IDX),
      currentDate.toISOString().substring(0, DATE_SUBSTRING_IDX),
    ],
    [DATE_OPTION_6M_KEY]: [
      minus6Months.toISOString().substring(0, DATE_SUBSTRING_IDX),
      currentDate.toISOString().substring(0, DATE_SUBSTRING_IDX),
    ],
    [DATE_OPTION_1Y_KEY]: [
      minus1Year.toISOString().substring(0, DATE_SUBSTRING_IDX),
      currentDate.toISOString().substring(0, DATE_SUBSTRING_IDX),
    ],
  };
}

/**
 * Gets the date range to use for fetching disaster event data when given a
 * selectedDate string.
 */
export function getDateRange(selectedDate: string): [string, string] {
  const customDateRanges = getCustomDateRanges();
  return selectedDate in customDateRanges
    ? customDateRanges[selectedDate]
    : [selectedDate, selectedDate];
}

/**
 * Get all event points for a set of data options. Only dates of type YYYY, YYYY-MM, or YYYY-MM-DD are supported.
 * @param dataOptions the options to use for the data fetch
 */
export function fetchDisasterEventPoints(
  dataOptions: DisasterDataOptions
): Promise<DisasterEventPointData> {
  // Date range to fetch data for.
  const dateRange = getDateRange(dataOptions.selectedDate);
  const promises = [];
  for (const eventType of dataOptions.eventTypeSpec.eventTypeDcids) {
    promises.push(
      fetchEventPoints(
        eventType,
        dataOptions.place,
        dateRange,
        dataOptions.eventTypeSpec,
        dataOptions.severityFilters[dataOptions.eventTypeSpec.id],
        dataOptions.useCache
      )
    );
  }
  return Promise.all(promises).then((resp) => {
    const result = {
      eventPoints: [],
      provenanceInfo: {},
    };
    resp.forEach((eventTypeResp) => {
      result.eventPoints.push(...eventTypeResp.eventPoints);
      Object.assign(result.provenanceInfo, eventTypeResp.provenanceInfo);
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

/**
 * Sets the url hash with the given key, value, and block
 * @param paramKey the param key to update in the hash
 * @param paramValue the value to use in the hash
 */
export function setUrlHash(
  paramKey: string,
  paramValue: string,
  blockId: string
): void {
  // TODO (chejennifer): Right now we are assuming each subject page only has
  // one disaster event map tile. Find a way to handle the url hash for
  // mulitple disaster event map tiles.
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  const blockParamString = urlParams.get(blockId) || "";
  let blockParamVal = {};
  if (blockParamString) {
    blockParamVal = JSON.parse(blockParamString);
  }
  blockParamVal[paramKey] = paramValue;
  urlParams.set(blockId, JSON.stringify(blockParamVal));
  window.location.hash = urlParams.toString();
}

/**
 * Gets the hash value for a url param key for a specific block.
 *
 */
export function getHashValue(paramKey: string, blockId: string): string {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  const blockParamString = urlParams.get(blockId) || "";
  let blockParamVal = {};
  if (blockParamString) {
    blockParamVal = JSON.parse(blockParamString);
  }
  return blockParamVal[paramKey] || "";
}

/**
 * Gets the date for a disaster event map using url params.
 */
export function getDate(blockId: string): string {
  return getHashValue(URL_HASH_PARAM_KEYS.DATE, blockId) || DATE_OPTION_1Y_KEY;
}

/**
 * Gets the severity filters for a disaster event map using url params.
 * @param eventTypeSpec the event type spec for the disaster event map
 * @param blockId the id of the block to get severity filters for
 */
export function getSeverityFilters(
  eventTypeSpec: Record<string, EventTypeSpec>,
  blockId: string
): Record<string, SeverityFilter> {
  const urlSeverityFilterVal = getHashValue(
    URL_HASH_PARAM_KEYS.SEVERITY_FILTER,
    blockId
  );
  let severityFilters = {};
  if (urlSeverityFilterVal) {
    severityFilters = JSON.parse(urlSeverityFilterVal);
  }
  if (!_.isEmpty(severityFilters)) {
    return severityFilters;
  }
  for (const spec of Object.values(eventTypeSpec)) {
    if (_.isEmpty(spec.defaultSeverityFilter)) {
      continue;
    }
    severityFilters[spec.id] = spec.defaultSeverityFilter;
  }
  return severityFilters;
}

/**
 * If true, use EventCollectionCache for data fetch. Otherwise, use saved JSON files.
 */
export function getUseCache(): boolean {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  const useJsonVal = urlParams.get(URL_HASH_PARAM_KEYS.USE_JSON) || "";
  return useJsonVal !== "1";
}

/**
 * gets the severity value for a disaster event point
 * @param eventPoint event point to get the severity value from
 * @param eventTypeSpec event type spec to use to get the severity value
 */
function getSeverityValue(
  eventPoint: DisasterEventPoint,
  eventTypeSpec: EventTypeSpec
): number {
  const severityFilter = eventTypeSpec.defaultSeverityFilter;
  if (!severityFilter || !(severityFilter.prop in eventPoint.severity)) {
    return null;
  }
  return eventPoint.severity[severityFilter.prop];
}

/**
 * Gets the map points data for a disaster type for a list of disaster event
 * points.
 * @param eventPoints event points to use for the map points data
 * @param eventTypeSpec the event type spec for the disaster event map
 */
export function getMapPointsData(
  eventPoints: DisasterEventPoint[],
  eventTypeSpec: EventTypeSpec
): MapPointsData {
  const mapPointsData = {
    points: [],
    values: {},
  };
  eventPoints.forEach((point) => {
    mapPointsData.points.push(point);
    const severityValue = getSeverityValue(point, eventTypeSpec);
    if (severityValue != null) {
      mapPointsData.values[point.placeDcid] = severityValue;
    }
  });
  return mapPointsData;
}
