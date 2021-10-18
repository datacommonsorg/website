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
import { StatVarNode } from "../../shared/stat_var";
import {
  ContextType,
  Axis,
  PlaceInfo,
  EmptyAxis,
  EmptyPlace,
  FieldToAbbreviation,
  DisplayOptionsWrapper,
} from "./context";
import { PlacePointStat } from "../shared_util";

export enum ScatterChartType {
  SCATTER,
  MAP,
}

const URL_PARAM_VALUE_SEPARATOR = "-";

async function getPlacesInNames(
  dcid: string,
  type: string
): Promise<Record<string, string>> {
  const resp = await axios.get(
    `/api/place/places-in-names?dcid=${dcid}&placeType=${type}`
  );
  return resp.data;
}

async function getStatsWithinPlace(
  parent_place: string,
  child_type: string,
  statVars: Array<string>
): Promise<Record<string, PlacePointStat>> {
  let statVarParams = "";
  for (const statVar of statVars) {
    statVarParams += `&stat_vars=${statVar}`;
  }
  return axios
    .get(
      `/api/stats/within-place?parent_place=${parent_place}&child_type=${child_type}${statVarParams}`
    )
    .then((resp) => {
      return resp.data;
    });
}

/**
 * Given a `StatsVarNode` that only has one key,
 * return the key.
 * @param node
 */
function nodeGetStatVar(node: StatVarNode): string {
  return _.findKey(node);
}

/**
 * Parses the hash and updates the context accordingly.
 * @param context
 */
function applyHash(context: ContextType): void {
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

  return axis;
}

/**
 * Uses the parsed hash to produce a `PlaceInfo`.
 * @param params
 */
function applyHashPlace(params: URLSearchParams): PlaceInfo {
  const place = _.cloneDeep(EmptyPlace);
  const dcid = params.get(FieldToAbbreviation.enclosingPlaceDcid);
  const enclosingPlaceTypes = params.get(
    FieldToAbbreviation.enclosingPlaceTypes
  );
  if (dcid) {
    place.enclosingPlace = {
      dcid: dcid,
      name: params.get(FieldToAbbreviation.enclosingPlaceName),
      types: enclosingPlaceTypes
        ? enclosingPlaceTypes.split(URL_PARAM_VALUE_SEPARATOR)
        : [],
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

function applyHashBoolean(params: URLSearchParams, key: string): boolean {
  const val = params.get(key);
  return val === "1";
}

/**
 * Updates the hash based on the context and returns the new hash.
 * If there are multiple denominators for a statvar, only the first
 * one is stored in the hash.
 * @param context
 */
function updateHash(context: ContextType): void {
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
    const enclosingPlaceTypes = !_.isEmpty(place.enclosingPlace.types)
      ? place.enclosingPlace.types.join(URL_PARAM_VALUE_SEPARATOR)
      : "";
    hash = appendEntry(
      hash,
      FieldToAbbreviation.enclosingPlaceDcid,
      place.enclosingPlace.dcid
    );
    hash = appendEntry(
      hash,
      FieldToAbbreviation.enclosingPlaceName,
      place.enclosingPlace.name
    );
    hash = appendEntry(
      hash,
      FieldToAbbreviation.enclosingPlaceTypes,
      enclosingPlaceTypes
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
  let val = display.showQuadrants ? "1" : "0";
  hash = appendEntry(hash, FieldToAbbreviation.showQuadrant, val);

  val = display.showLabels ? "1" : "0";
  hash = appendEntry(hash, FieldToAbbreviation.showLabels, val);

  val = display.chartType === ScatterChartType.SCATTER ? "0" : "1";
  hash = appendEntry(hash, FieldToAbbreviation.chartType, val);

  return hash;
}

/**
 * Checks if the place options have been selected.
 * @param place
 */
export function isPlacePicked(place: PlaceInfo): boolean {
  return (
    place.enclosedPlaceType === "Country" ||
    (!_.isEmpty(place.enclosedPlaceType) &&
      !_.isEmpty(place.enclosingPlace.dcid))
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

export {
  getPlacesInNames,
  getStatsWithinPlace,
  nodeGetStatVar,
  updateHash,
  applyHash,
};
