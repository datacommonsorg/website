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
import * as d3 from "d3";
import { StatsVarNode } from "../statvar_menu/util";
import {
  ContextType,
  Axis,
  PlaceInfo,
  EmptyAxis,
  EmptyPlace,
  FieldToAbbreviation,
} from "./context";

interface PlacePointStatMetadata {
  provenanceUrl: string;
  measurementMethod: string;
  unit?: string;
}

interface PlacePointStatData {
  date: string;
  value: number;
  metadata: { importName: string };
}
interface PlacePointStat {
  metadata: { [importName: string]: PlacePointStatMetadata };
  stat: { [dcid: string]: PlacePointStatData };
}

interface SourceSeries {
  data: { [date: string]: number };
  placeName: string;
  provenanceUrl: string;
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
function nodeGetStatVar(node: StatsVarNode): string {
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
  if (hash) {
    history.pushState({}, "", `/tools/scatter#${encodeURIComponent(hash)}`);
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
 * Helper function to choose the date to use for the population data.
 * @param popData
 * @param statData
 */
function getPopulationDate(
  popData: SourceSeries,
  statData: PlacePointStatData
): string {
  const xPopDataDates = Object.keys(popData.data);
  let popDate = xPopDataDates.find((date) => date === statData.date);
  if (!popDate && !_.isEmpty(xPopDataDates)) {
    // Filter for all population dates encompassed by the stat var date.
    // ie. if stat var date is year, filter for all population dates with
    // the same year
    const encompassedPopDates = xPopDataDates.filter((date) => {
      return date.includes(statData.date);
    });
    if (encompassedPopDates.length > 0) {
      // when there are multiple population dates encompassed by the stat var
      // date, choose the latest date
      popDate = encompassedPopDates[encompassedPopDates.length - 1];
    } else {
      // From ordered list of population dates, choose the date immediately
      // before the stat var date (if there is a date that encompasses the stat
      // var date, this will get chosen). If none, return the first pop date.
      const idx = d3.bisect(xPopDataDates, statData.date);
      popDate = idx > 0 ? xPopDataDates[idx - 1] : xPopDataDates[0];
    }
  }
  return popDate;
}

export {
  getPlacesInNames,
  getStatsWithinPlace,
  nodeGetStatVar,
  updateHash,
  applyHash,
  getPopulationDate,
  PlacePointStat,
  SourceSeries,
};
