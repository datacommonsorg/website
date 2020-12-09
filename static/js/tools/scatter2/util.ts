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
import { StatsVarNode } from "../timeline_util";
import {
  ContextType,
  Axis,
  PlaceInfo,
  EmptyAxis,
  EmptyPlace,
  EmptyDate,
  FieldToAbbreviation,
  DateInfo,
} from "./context";

interface SourceSeries {
  val: Record<string, number>;
  measurementMethod: string;
  importName: string;
  provenanceDomain: string;
  provenanceUrl: string;
  observationPeriod: string;
  unit: string;
  scalingFactor: string;
  isDcAggregate: boolean;
  date: string;
}

async function getPlacesInNames(
  dcid: string,
  type: string
): Promise<Record<string, string>> {
  const resp = await axios.get(
    `/api/place/places-in-names?dcid=${dcid}&placeType=${type}`
  );
  return resp.data;
}

async function getStatsCollection(
  parent_place: string,
  child_type: string,
  date: string,
  statVars: Array<string>
): Promise<Record<string, SourceSeries>> {
  let statVarParams = "";
  for (const statVar of statVars) {
    statVarParams += `&stat_vars=${statVar}`;
  }
  const resp = await axios.get(
    `/api/stats/collection?parent_place=${parent_place}&child_type=${child_type}&date=${date}${statVarParams}`
  );
  // Tag `SourceSeries`'s with the requested date
  const data = resp.data;
  for (const dcid in data) {
    const sourceSeries = data[dcid];
    if (_.isEmpty(sourceSeries)) {
      continue;
    }
    sourceSeries["date"] = date;
  }
  return data;
}

/**
 * Given a `StatsVarNode` that only has one key,
 * return the key.
 * @param node
 */
function nodeGetStatVar(node: StatsVarNode): string {
  return _.findKey(node);
}

/**
 * Checks if the date of data to retrieve is chosen.
 * Returns true if year is chosen, or year and month are chosen,
 * or year, month, and day are chosen.
 * @param date
 */
function isDateChosen(date: DateInfo): boolean {
  return (
    date.year > 0 ||
    (date.year > 0 && date.month > 0) ||
    (date.year > 0 && date.month > 0 && date.day > 0)
  );
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
  context.date.set(applyHashDate(params));
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

  const node: StatsVarNode = {
    [dcid]: {
      paths: [],
      denominators: [],
    },
  };
  const path = params.get(addSuffix(FieldToAbbreviation.statVarPath, isX));
  if (path) {
    node[dcid].paths = [path.split("-")];
  }
  const denominator = params.get(
    addSuffix(FieldToAbbreviation.statVarDenominator, isX)
  );
  if (denominator) {
    node[dcid].denominators = [denominator];
  }
  axis.statVar = node;

  for (const key of ["name", "log", "perCapita"]) {
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
  if (dcid) {
    place.enclosingPlace = {
      dcid: dcid,
      name: params.get(FieldToAbbreviation.enclosingPlaceName),
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

/**
 * Uses the parsed hash to produce a `DateInfo`.
 * @param params
 */
function applyHashDate(params: URLSearchParams): DateInfo {
  const date = _.cloneDeep(EmptyDate);
  for (const key of ["year", "month", "day"]) {
    const value = params.get(FieldToAbbreviation[key]);
    if (value) {
      date[key] = Number.parseInt(value);
    }
  }
  return date;
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
  const date = context.date.value;
  let hash = updateHashAxis("", x, true);
  hash = updateHashAxis(hash, y, false);
  hash = updateHashPlace(hash, place);
  hash = updateHashDate(hash, date);
  if (hash) {
    history.pushState({}, "", `/tools/scatter2#${encodeURIComponent(hash)}`);
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
  const statVarDcid = nodeGetStatVar(axis.statVar);
  if (statVarDcid) {
    hash = appendEntry(
      hash,
      addSuffix(FieldToAbbreviation.statVarDcid, isX),
      statVarDcid
    );
    const node = axis.statVar[statVarDcid];
    if (!_.isEmpty(node.paths)) {
      hash = appendEntry(
        hash,
        addSuffix(FieldToAbbreviation.statVarPath, isX),
        node.paths[0].join("-")
      );
    }
    if (!_.isEmpty(node.denominators)) {
      hash = appendEntry(
        hash,
        addSuffix(FieldToAbbreviation.statVarDenominator, isX),
        node.denominators[0]
      );
    }
    for (const key of ["name", "log", "perCapita"]) {
      if (axis[key]) {
        hash = appendEntry(
          hash,
          addSuffix(FieldToAbbreviation[key], isX),
          axis[key] === true ? "1" : axis[key]
        );
      }
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
    hash = appendEntry(
      hash,
      FieldToAbbreviation.enclosingPlaceName,
      place.enclosingPlace.name
    );
  }
  for (const key of ["enclosedPlaceType", "lowerBound", "upperBound"]) {
    if (place[key] !== EmptyPlace[key]) {
      hash = appendEntry(hash, FieldToAbbreviation[key], place[key].toString());
    }
  }
  return hash;
}

/**
 * Updates the hash based on the `DateInfo` and returns the new hash.
 * @param hash
 * @param date
 */
function updateHashDate(hash: string, date: DateInfo) {
  if (_.isEqual(date, EmptyDate)) {
    return hash;
  }
  for (const key of ["year", "month", "day"]) {
    if (date[key]) {
      hash = appendEntry(hash, FieldToAbbreviation[key], date[key].toString());
    }
  }
  return hash;
}

export {
  getPlacesInNames,
  getStatsCollection,
  nodeGetStatVar,
  isDateChosen,
  updateHash,
  applyHash,
  SourceSeries,
};
