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
 * Functions for making API calls and updating and applying URL hash.
 */

import axios from "axios";
import _ from "lodash";

import { DEFAULT_POPULATION_DCID } from "../../shared/constants";
import { PointAllApiResponse, PointApiResponse } from "../../shared/stat_types";
import { getCappedStatVarDate } from "../../shared/util";
import { stringifyFn } from "../../utils/axios";
import {
  Axis,
  ContextType,
  DisplayOptionsWrapper,
  EmptyAxis,
  EmptyPlace,
  FieldToAbbreviation,
  PlaceInfo,
  PointScaleState,
  SHOW_POPULATION_LINEAR,
  SHOW_POPULATION_LOG,
  SHOW_POPULATION_OFF,
} from "./context";

export enum ScatterChartType {
  SCATTER,
  MAP,
}

/**
 * Returns a promise that will get all the data from preferred sources for
 * a place type within a place for a list of stat vars.
 *
 * @param parentPlace the place to get data within
 * @param childType the type of place to get data for
 * @param statVars the stat vars to get data for
 * @param apiRoot API root
 *
 */
export async function getStatWithinPlace(
  parentPlace: string,
  childType: string,
  statVars: { statVarDcid: string; date?: string }[],
  apiRoot?: string
): Promise<PointApiResponse> {
  // There are two stat vars for scatter plot.
  //
  // For IPCC stat vars, need to cut the data up to certain date, so here will
  // always send two requests for each stat var.
  const promises: Promise<PointApiResponse>[] = [];
  for (const statVar of statVars) {
    let dataDate = getCappedStatVarDate(statVar.statVarDcid);
    // If there is a specified date, get the data for that date.
    if (statVar.date) {
      dataDate = statVar.date;
    }
    promises.push(
      axios
        .get<PointApiResponse>(
          `${apiRoot || ""}/api/observations/point/within`,
          {
            params: {
              childType,
              date: dataDate,
              parentEntity: parentPlace,
              variables: [statVar.statVarDcid],
            },
            paramsSerializer: stringifyFn,
          }
        )
        .then((resp) => resp.data)
    );
  }
  return Promise.all(promises).then((responses) => {
    const result: PointApiResponse = {
      data: {},
      facets: {},
    };
    for (const resp of responses) {
      result.data = Object.assign(result.data, resp.data);
      result.facets = Object.assign(result.facets, resp.facets);
    }
    return result;
  });
}

/**
 * Returns a promise that will get all the data from all available sources for
 * a place type within a place for a list of stat vars.
 *
 * @param parentPlace the place to get data within
 * @param childType the type of place to get data for
 * @param statVars the stat vars to get data for
 *
 */
export async function getStatAllWithinPlace(
  parentPlace: string,
  childType: string,
  statVars: { statVarDcid: string; date?: string }[]
): Promise<PointAllApiResponse> {
  // There are two stat vars for scatter plot.
  //
  // For IPCC stat vars, need to cut the data up to certain date, so here will
  // always send two requests for each stat var.
  const promises: Promise<PointAllApiResponse>[] = [];
  for (const statVar of statVars) {
    let dataDate = getCappedStatVarDate(statVar.statVarDcid);
    // If there is a specified date, get the data for that date.
    if (statVar.date) {
      dataDate = statVar.date;
    }
    promises.push(
      axios
        .get<PointAllApiResponse>("/api/observations/point/within/all", {
          params: {
            childType,
            date: dataDate,
            parentEntity: parentPlace,
            variables: [statVar.statVarDcid],
          },
          paramsSerializer: stringifyFn,
        })
        .then((resp) => resp.data)
    );
  }
  return Promise.all(promises).then((responses) => {
    const result: PointAllApiResponse = {
      data: {},
      facets: {},
    };
    for (const resp of responses) {
      result.data = Object.assign(result.data, resp.data);
      result.facets = Object.assign(result.facets, resp.facets);
    }
    return result;
  });
}

/**
 * Appends "x" or "y" to the key based on `isX`.
 * @param key
 * @param isX
 */
function addSuffix(key: string, isX: boolean) {
  return `${key}${isX ? "x" : "y"}`;
}

/**
 * Uses the parsed hash to produce an `Axis`.
 * @param params
 * @param isX
 */
function applyHashAxis(params: URLSearchParams, isX: boolean): Axis {
  const dcid = params.get(addSuffix(FieldToAbbreviation.statVarDcid, isX));
  if (!dcid) {
    return EmptyAxis;
  }
  const axis = _.cloneDeep(EmptyAxis);
  axis.statVarDcid = dcid;

  for (const key of ["log", "perCapita"]) {
    const value = params.get(addSuffix(FieldToAbbreviation[key], isX));
    if (value) {
      axis[key] = value === "1" ? true : value;
    }
  }
  axis.date = params.get(addSuffix(FieldToAbbreviation.date, isX)) || "";
  axis.metahash =
    params.get(addSuffix(FieldToAbbreviation.metahash, isX)) || "";
  axis.denom =
    params.get(addSuffix(FieldToAbbreviation.denom, isX)) ||
    DEFAULT_POPULATION_DCID;
  return axis;
}

/**
 * Uses the parsed hash to produce a `PlaceInfo`.
 * @param params
 */
function applyHashPlace(params: URLSearchParams): PlaceInfo {
  const place = _.cloneDeep(EmptyPlace);
  const dcid = params.get(FieldToAbbreviation.enclosingPlaceDcid);
  if (dcid) {
    place.enclosingPlace = {
      dcid,
      name: "",
      types: null,
    };
  }
  const type = params.get(FieldToAbbreviation.enclosedPlaceType);
  if (type) {
    place.enclosedPlaceType = type;
  }
  for (const key of ["lowerBound", "upperBound"]) {
    const value = params.get(FieldToAbbreviation[key]);
    if (value) {
      place[key] = Number.parseInt(value);
    }
  }
  return place;
}

export function applyHashBoolean(
  params: URLSearchParams,
  key: string
): boolean {
  const val = params.get(key);
  return val === "1";
}

/**
 * Fetches a population point scale state from the given url query params
 * @param params url query parameters
 * @returns PointScaleState value
 */
export function applyHashPopulation(params: URLSearchParams): PointScaleState {
  const val = params.get(FieldToAbbreviation.showPopulation) || "";
  if (val.toLowerCase() === SHOW_POPULATION_LINEAR) {
    return SHOW_POPULATION_LINEAR;
  } else if (val.toLowerCase() === SHOW_POPULATION_LOG) {
    return SHOW_POPULATION_LOG;
  }
  return SHOW_POPULATION_OFF;
}

export function updateHashBoolean(
  hash: string,
  key: string,
  value: boolean
): string {
  if (value) {
    return appendEntry(hash, key, "1");
  }
  return hash;
}

/**
 * Parses the hash and updates the context accordingly.
 * @param context
 */
export function applyHash(context: ContextType): void {
  const params = new URLSearchParams(
    decodeURIComponent(location.hash).replace("#", "?")
  );
  context.x.set(applyHashAxis(params, true));
  context.y.set(applyHashAxis(params, false));
  context.place.set(applyHashPlace(params));
  context.display.setQuadrants(
    applyHashBoolean(params, FieldToAbbreviation.showQuadrant)
  );
  context.display.setLabels(
    applyHashBoolean(params, FieldToAbbreviation.showLabels)
  );
  const chartType =
    params.get(FieldToAbbreviation.chartType) === "1"
      ? ScatterChartType.MAP
      : ScatterChartType.SCATTER;
  context.display.setChartType(chartType);
  context.display.setDensity(
    applyHashBoolean(params, FieldToAbbreviation.showDensity)
  );
  context.display.setRegression(
    applyHashBoolean(params, FieldToAbbreviation.showRegression)
  );
  context.display.setPopulation(applyHashPopulation(params));
}
/**
 * Updates the hash based on the context and returns the new hash.
 * If there are multiple denominators for a statvar, only the first
 * one is stored in the hash.
 * @param context
 */
export function updateHash(context: ContextType): void {
  const x = context.x.value;
  const y = context.y.value;
  const place = context.place.value;
  let hash = updateHashAxis("", x, true);
  hash = updateHashAxis(hash, y, false);
  hash = updateHashPlace(hash, place);
  hash = updateHashDisplayOptions(hash, context.display);
  const newHash = encodeURIComponent(hash);
  const currentHash = location.hash.replace("#", "");
  if (newHash && newHash !== currentHash) {
    history.pushState({}, "", `/tools/scatter#${newHash}`);
  }
}

/**
 * Appends a key-value mapping to the hash.
 * @param hash
 * @param key
 * @param value
 */
function appendEntry(hash: string, key: string, value: string): string {
  return `${hash}&${key}=${value}`;
}

/**
 * Updates the hash based on the axis and returns the new hash.
 * @param hash
 * @param axis
 * @param isX
 */
function updateHashAxis(hash: string, axis: Axis, isX: boolean): string {
  if (_.isEqual(axis, EmptyAxis)) {
    return hash;
  }

  hash = appendEntry(
    hash,
    addSuffix(FieldToAbbreviation.statVarDcid, isX),
    axis.statVarDcid
  );
  for (const key of ["log", "perCapita"]) {
    if (axis[key]) {
      hash = appendEntry(
        hash,
        addSuffix(FieldToAbbreviation[key], isX),
        axis[key] === true ? "1" : axis[key]
      );
    }
  }
  for (const key of ["date", "metahash", "denom"]) {
    if (axis[key]) {
      hash = appendEntry(
        hash,
        addSuffix(FieldToAbbreviation[key], isX),
        axis[key]
      );
    }
  }
  return hash;
}

/**
 * Updates the hash based on the `PlaceInfo` and returns the new hash.
 * @param hash
 * @param place
 */
function updateHashPlace(hash: string, place: PlaceInfo): string {
  if (_.isEqual(place, EmptyPlace)) {
    return hash;
  }
  if (place.enclosingPlace.dcid) {
    hash = appendEntry(
      hash,
      FieldToAbbreviation.enclosingPlaceDcid,
      place.enclosingPlace.dcid
    );
  }
  for (const key of ["enclosedPlaceType", "lowerBound", "upperBound"]) {
    if (place[key] !== EmptyPlace[key]) {
      hash = appendEntry(hash, FieldToAbbreviation[key], place[key].toString());
    }
  }
  return hash;
}

function updateHashDisplayOptions(
  hash: string,
  display: DisplayOptionsWrapper
) {
  hash = updateHashBoolean(
    hash,
    FieldToAbbreviation.showQuadrant,
    display.showQuadrants
  );
  hash = updateHashBoolean(
    hash,
    FieldToAbbreviation.showLabels,
    display.showLabels
  );
  hash = updateHashBoolean(
    hash,
    FieldToAbbreviation.showDensity,
    display.showDensity
  );
  hash = updateHashBoolean(
    hash,
    FieldToAbbreviation.showRegression,
    display.showRegression
  );
  hash = updateHashBoolean(
    hash,
    FieldToAbbreviation.chartType,
    display.chartType === ScatterChartType.MAP
  );
  hash = appendEntry(
    hash,
    FieldToAbbreviation.showPopulation,
    display.showPopulation
  );
  return hash;
}

/**
 * Checks if the place options have been selected.
 * @param place
 */
export function isPlacePicked(place: PlaceInfo): boolean {
  return (
    !_.isEmpty(place.enclosedPlaceType) && !_.isEmpty(place.enclosingPlace.dcid)
  );
}

/**
 * Checks if the child places have been loaded.
 * @param place
 */
export function arePlacesLoaded(place: PlaceInfo): boolean {
  return isPlacePicked(place) && !_.isEmpty(place.enclosedPlaces);
}

/**
 * Checks if both x and y stat vars have been selected.
 * @param x
 * @param y
 */
export function areStatVarsPicked(x: Axis, y: Axis): boolean {
  return !_.isNull(x.statVarInfo) && !_.isNull(y.statVarInfo);
}
