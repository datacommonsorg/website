/**
 * Copyright 2021 Google LLC
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
 * Utility functions shared across different components of map explorer.
 */

import _ from "lodash";

import {
  EUROPE_NAMED_TYPED_PLACE,
  INDIA_PLACE_DCID,
  USA_PLACE_DCID,
} from "../../shared/constants";
import { NamedPlace } from "../../shared/types";
import { isChildPlaceOf } from "../shared_util";
import { DisplayOptions, NamedTypedPlace, PlaceInfo, StatVar } from "./context";

const URL_PARAM_VALUE_SEPARATOR = "-";
const URL_PARAM_DOMAIN_SEPARATOR = ":";
const URL_PARAM_KEYS = {
  SELECTED_PLACE_DCID: "pd",
  SELECTED_PLACE_NAME: "pn",
  SELECTED_PLACE_TYPES: "pt",
  ENCLOSED_PLACE_TYPE: "ept",
  MAP_POINTS_PLACE_TYPE: "ppt",
  PER_CAPITA: "pc",
  STAT_VAR_DCID: "sv",
  DATE: "dt",
  COLOR: "color",
  DOMAIN: "domain",
  DENOM: "denom",
  MAP_POINTS: "mp",
};
const SV_REGEX_INSTALLATION_MAPPING = {
  Emissions: "EpaReportingFacility",
  AirPollutant: "AirQualitySite",
};

export const DEFAULT_DENOM = "Count_Person";
export const DEFAULT_DISPLAY_OPTIONS = {
  color: "",
  domain: null,
  showMapPoints: false,
};

export const ALL_MAP_PLACE_TYPES = {
  Planet: "",
  Continent: "",
  Country: "",
  State: "",
  County: "",
  AdministrativeArea1: "",
  AdministrativeArea2: "",
  EurostatNUTS1: "",
  EurostatNUTS2: "",
  EurostatNUTS3: "",
};

export const EARTH_CHILD_PLACE_TYPES = {
  Planet: ["Country"],
  Continent: ["Country"],
};

export const USA_CHILD_PLACE_TYPES = {
  Country: ["State", "County"],
  State: ["County"],
  County: ["County"],
};

export const INDIA_CHILD_PLACE_TYPES = {
  Country: ["AdministrativeArea1", "AdministrativeArea2"],
  AdministrativeArea1: ["AdministrativeArea2"],
  State: ["AdministrativeArea2"],
  AdministrativeArea2: ["AdministrativeArea2"],
};

export const EUROPE_CHILD_PLACE_TYPES = {
  Continent: ["Country", "EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  Country: ["EurostatNUTS1", "EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS1: ["EurostatNUTS2", "EurostatNUTS3"],
  EurostatNUTS2: ["EurostatNUTS3"],
  EurostatNUTS3: ["EurostatNUTS3"],
};

export const CHILD_PLACE_TYPE_MAPPING = {
  [USA_PLACE_DCID]: USA_CHILD_PLACE_TYPES,
  [INDIA_PLACE_DCID]: INDIA_CHILD_PLACE_TYPES,
  [EUROPE_NAMED_TYPED_PLACE.dcid]: EUROPE_CHILD_PLACE_TYPES,
};

// list of place types in the US in the order of high to low granularity.
export const USA_PLACE_HIERARCHY = ["Country", "State", "County"];
export const MAP_REDIRECT_PREFIX = "/tools/map";

/**
 * Parses the hash and produces a StatVar
 * @param params the params in the hash
 */
export function applyHashStatVar(params: URLSearchParams): StatVar {
  const dcid = params.get(URL_PARAM_KEYS.STAT_VAR_DCID);
  const date = params.get(URL_PARAM_KEYS.DATE);
  const denom = params.get(URL_PARAM_KEYS.DENOM);
  if (!dcid) {
    return { dcid: "", perCapita: false, info: null, date: "", denom: "" };
  }
  const perCapita = params.get(URL_PARAM_KEYS.PER_CAPITA);
  return {
    dcid,
    perCapita: perCapita && perCapita === "1" ? true : false,
    info: null,
    date: date ? date : "",
    denom: denom ? denom : DEFAULT_DENOM,
  };
}

/**
 * Parses the hash and produces a PlaceInfo
 * @param params the params in the hash
 */
export function applyHashPlaceInfo(params: URLSearchParams): PlaceInfo {
  const selectedPlaceDcid = params.get(URL_PARAM_KEYS.SELECTED_PLACE_DCID);
  const selectedPlaceName = params.get(URL_PARAM_KEYS.SELECTED_PLACE_NAME);
  const selectedPlaceTypes = params.get(URL_PARAM_KEYS.SELECTED_PLACE_TYPES);
  const enclosedPlaceType = params.get(URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE);
  const mapPointsPlaceType = params.get(URL_PARAM_KEYS.MAP_POINTS_PLACE_TYPE);
  return {
    selectedPlace: {
      dcid: selectedPlaceDcid ? selectedPlaceDcid : "",
      name: selectedPlaceName ? selectedPlaceName : "",
      types: selectedPlaceTypes
        ? selectedPlaceTypes.split(URL_PARAM_VALUE_SEPARATOR)
        : [],
    },
    enclosingPlace: {
      dcid: "",
      name: "",
    },
    enclosedPlaces: [],
    enclosedPlaceType: enclosedPlaceType ? enclosedPlaceType : "",
    parentPlaces: null,
    mapPointsPlaceType: mapPointsPlaceType ? mapPointsPlaceType : "",
  };
}

/**
 * Parses the hash and produces a DisplayOptions
 * @param params the params in the hash
 */
export function applyHashDisplay(params: URLSearchParams): DisplayOptions {
  const color = params.get(URL_PARAM_KEYS.COLOR);
  const domainParamValue = params.get(URL_PARAM_KEYS.DOMAIN);
  const domain = domainParamValue
    ? domainParamValue
        .split(URL_PARAM_DOMAIN_SEPARATOR)
        .map((val) => Number(val))
    : [];
  const showMapPoints = params.get(URL_PARAM_KEYS.MAP_POINTS);
  return {
    color,
    domain: domain.length === 3 ? (domain as [number, number, number]) : null,
    showMapPoints: showMapPoints && showMapPoints === "1" ? true : false,
  };
}

/**
 * Updates the hash based on a StatVar and returns the new hash
 * @param hash the current hash
 * @param statVar the StatVar to update the hash with
 */
export function updateHashStatVar(hash: string, statVar: StatVar): string {
  if (_.isEmpty(statVar.dcid)) {
    return hash;
  }
  const perCapita = statVar.perCapita ? "1" : "0";
  const dateParam = statVar.date
    ? `&${URL_PARAM_KEYS.DATE}=${statVar.date}`
    : "";
  const params =
    `&${URL_PARAM_KEYS.STAT_VAR_DCID}=${statVar.dcid}` +
    `&${URL_PARAM_KEYS.PER_CAPITA}=${perCapita}` +
    `&${URL_PARAM_KEYS.DENOM}=${statVar.denom}` +
    dateParam;
  return hash + params;
}

/**
 * Updates the hash based on a PlaceInfo and returns the new hash
 * @param hash the current hash
 * @param placeInfo the PlaceInfo to update the hash with
 */
export function updateHashPlaceInfo(
  hash: string,
  placeInfo: PlaceInfo
): string {
  if (_.isEmpty(placeInfo.selectedPlace.dcid)) {
    return hash;
  }
  const selectedPlaceTypes = !_.isEmpty(placeInfo.selectedPlace.types)
    ? placeInfo.selectedPlace.types.join(URL_PARAM_VALUE_SEPARATOR)
    : "";
  let params =
    `&${URL_PARAM_KEYS.SELECTED_PLACE_DCID}=${placeInfo.selectedPlace.dcid}` +
    `&${URL_PARAM_KEYS.SELECTED_PLACE_NAME}=${placeInfo.selectedPlace.name}` +
    `&${URL_PARAM_KEYS.SELECTED_PLACE_TYPES}=${selectedPlaceTypes}`;
  if (!_.isEmpty(placeInfo.enclosedPlaceType)) {
    params = `${params}&${URL_PARAM_KEYS.ENCLOSED_PLACE_TYPE}=${placeInfo.enclosedPlaceType}`;
  }
  if (!_.isEmpty(placeInfo.mapPointsPlaceType)) {
    params = `${params}&${URL_PARAM_KEYS.MAP_POINTS_PLACE_TYPE}=${placeInfo.mapPointsPlaceType}`;
  }
  return hash + params;
}

/**
 * Updates the hash based on DisplayOptions and returns the new hash
 * @param hash the current hash
 * @param placeInfo the DisplayOptions to update the hash with
 */
export function updateHashDisplay(
  hash: string,
  display: DisplayOptions
): string {
  let params = "";
  if (display.showMapPoints) {
    params = `${params}&${URL_PARAM_KEYS.MAP_POINTS}=${
      display.showMapPoints ? "1" : "0"
    }`;
  }
  if (display.color) {
    params = `${params}&${URL_PARAM_KEYS.COLOR}=${display.color}`;
  }
  if (display.domain) {
    params = `${params}&${URL_PARAM_KEYS.DOMAIN}=${display.domain.join(
      URL_PARAM_DOMAIN_SEPARATOR
    )}`;
  }
  return hash + params;
}

/**
 * Get the link to the map explorer page for a given place and stat var
 * @param statVar the stat var of the map page to redirect to
 * @param selectedPlace the place of the map page to redirect to
 * @param parentPlaces the parent places of the place we are redirecting to
 * @param mapPointsPlaceType the map points place type of the map page to redirect to
 */
export function getRedirectLink(
  statVar: StatVar,
  selectedPlace: NamedTypedPlace,
  parentPlaces: NamedPlace[],
  mapPointsPlaceType: string,
  displayOptions: DisplayOptions
): string {
  let hash = updateHashStatVar("", statVar);
  hash = updateHashDisplay(hash, displayOptions);
  const enclosedPlaceTypes = getAllChildPlaceTypes(selectedPlace, parentPlaces);
  hash = updateHashPlaceInfo(hash, {
    enclosedPlaces: [],
    enclosedPlaceType: !_.isEmpty(enclosedPlaceTypes)
      ? enclosedPlaceTypes[0]
      : "",
    enclosingPlace: { dcid: "", name: "" },
    mapPointsPlaceType,
    parentPlaces: [],
    selectedPlace,
  });
  return `${MAP_REDIRECT_PREFIX}#${encodeURIComponent(hash)}`;
}

/**
 * Given a stat var, get the place type for plotting map points
 * @param svDcid dcid of the stat var to plot map points for
 */
export function getMapPointsPlaceType(svDcid: string): string {
  for (const svRegex in SV_REGEX_INSTALLATION_MAPPING) {
    if (svDcid.match(svRegex)) {
      return SV_REGEX_INSTALLATION_MAPPING[svRegex];
    }
  }
  return "";
}

/**
 * For a place, get its list of child place types that a map can be drawn for
 * @param place place to get the child place types for
 * @param parentPlaces parent places of the place of interest
 */
export function getAllChildPlaceTypes(
  place: NamedTypedPlace,
  parentPlaces: NamedPlace[]
): string[] {
  let mapType = "";
  if (place.dcid in CHILD_PLACE_TYPE_MAPPING) {
    mapType = place.dcid;
  } else {
    for (const mapPlaceDcid in CHILD_PLACE_TYPE_MAPPING) {
      if (
        mapPlaceDcid === EUROPE_NAMED_TYPED_PLACE.dcid &&
        place.types.indexOf("Eurostat") === 0
      ) {
        mapType = mapPlaceDcid;
        break;
      }
      if (isChildPlaceOf(place.dcid, mapPlaceDcid, parentPlaces)) {
        mapType = mapPlaceDcid;
        break;
      }
    }
  }
  const mapTypeChildTypes =
    CHILD_PLACE_TYPE_MAPPING[mapType] || EARTH_CHILD_PLACE_TYPES;
  for (const type of place.types) {
    if (type in mapTypeChildTypes) {
      return mapTypeChildTypes[type];
    }
  }
  return [];
}

/**
 * For a place and related parent place list (this related parent place list can
 * be the parent place list for the selected place or a child or parent of the
 * selected place) get the parent place list for the selected place
 * @param place place to get parent place list for
 * @param enclosingPlace parent of selected place
 * @param parentPlaces related parent place list
 */
export function getParentPlaces(
  place: NamedPlace,
  enclosingPlace: NamedPlace,
  parentPlaces: NamedPlace[]
): NamedPlace[] {
  const parentPlacesList = _.cloneDeep(parentPlaces);
  const idxInParentPlaces = parentPlaces.findIndex(
    (parentPlace) => parentPlace.dcid === place.dcid
  );
  if (idxInParentPlaces > -1) {
    parentPlacesList.splice(0, idxInParentPlaces + 1);
  } else {
    if (
      !parentPlacesList.find(
        (parentPlace) => parentPlace.dcid === enclosingPlace.dcid
      )
    ) {
      parentPlacesList.unshift(enclosingPlace);
    }
  }
  return parentPlacesList;
}
