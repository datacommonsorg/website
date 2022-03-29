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
import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";

import {
  EARTH_NAMED_TYPED_PLACE,
  IPCC_PLACE_50_TYPE_DCID,
} from "../shared/constants";
import { TimeSeries } from "../shared/stat_types";
import { NamedPlace, NamedTypedPlace } from "../shared/types";
import { USA_PLACE_HIERARCHY } from "./map/util";

/**
 * Functions and interfaces shared between tools components
 */

export interface StatMetadata {
  importName?: string;
  provenanceUrl?: string;
  measurementMethod?: string;
  observationPeriod?: string;
  scalingFactor?: string;
  unit?: string;
}

export interface PlacePointStatData {
  date: string;
  value: number;
  metaHash?: number;
  metadata?: StatMetadata;
}
export interface PlacePointStat {
  metaHash?: number;
  stat: Record<string, PlacePointStatData>;
}

export interface PlacePointStatAll {
  statList: PlacePointStat[];
}

export interface PlaceStatDateWithinPlace {
  datePlaceCount: Record<string, number>;
  metadata: StatMetadata;
}

export interface GetStatSetResponse {
  data: Record<string, PlacePointStat>;
  metadata: Record<number, StatMetadata>;
}

export interface GetStatSetAllResponse {
  data: Record<string, PlacePointStatAll>;
  metadata: Record<number, StatMetadata>;
}

export interface GetPlaceStatDateWithinPlaceResponse {
  data: Record<string, Record<string, Array<PlaceStatDateWithinPlace>>>;
}

export interface SourceSeries {
  data: { [date: string]: number };
  placeName: string;
  provenanceUrl: string;
}

/**
 * Helper function to choose the date to use for population data.
 * @param popData
 * @param statData
 */
export function getPopulationDate(
  popData: TimeSeries,
  statData: PlacePointStatData
): string {
  const xPopDataDates = Object.keys(popData.val);
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

/**
 * Helper function to get units given a PlacePointStat
 * @param placePointStat
 */
export function getUnit(
  pps: PlacePointStat,
  metadataMap: Record<string, StatMetadata>
): string {
  let metaHash = pps.metaHash;
  if (metaHash) {
    return metadataMap[metaHash].unit;
  }
  for (const place in pps.stat) {
    metaHash = pps.stat[place].metaHash;
    if (metaHash in metadataMap) {
      return metadataMap[metaHash].unit;
    }
  }
  return "";
}

/**
 * Returns true if the stat var is an IPCC stat var with multiple measurement
 * methods (each representing a different computation model).
 */
export function isIpccStatVarWithMultipleModels(statVar: string): boolean {
  return (
    statVar.startsWith("PrecipitationRate") ||
    (statVar.indexOf("_Temperature") > 0 &&
      statVar.indexOf("Difference") < 0 &&
      statVar.indexOf("RCP") > 0)
  );
}

export function isIpccStatVar(statVar: string): boolean {
  return (
    isIpccStatVarWithMultipleModels(statVar) ||
    statVar == "Min_Temperature" ||
    statVar == "Max_Temperature"
  );
}

/**
 * All Temperature Stat Vars get a fixed color scale.
 * TODO: Reconcile these various utils.
 */
export function isTemperatureStatVar(statVar: string): boolean {
  return statVar.indexOf("Temperature") >= 0;
}

/**
 * All Wet Bulb Temperature Stat Vars get temperature color scales.
 * TODO: Reconcile these various utils.
 */
export function isWetBulbStatVar(statVar: string): boolean {
  return statVar.indexOf("Number of Months Based on") >= 0;
}

/**
 * Determine whether or not map boundaries should be drawn. We don't want to
 * draw map boundaries if the selected place type and the enclosed place type
 * are 2 or more levels away in the USA_PLACE_HIERARCHY.
 * Eg. if selected place type has the type country and enclosed place type is
 * county, should return false.
 * @param selectedPlace the place selected to show map for
 * @param enclosedPlaceType the type of place to plot
 */
export function shouldShowMapBoundaries(
  selectedPlace: NamedTypedPlace,
  enclosedPlaceType: string
): boolean {
  if (enclosedPlaceType === IPCC_PLACE_50_TYPE_DCID) {
    return false;
  }
  const selectedPlaceTypes = selectedPlace.types;
  if (
    enclosedPlaceType === "EurostatNUTS3" &&
    selectedPlaceTypes[0] !== "EurostatNUTS2"
  ) {
    return false;
  }
  let selectedPlaceTypeIdx = -1;
  if (selectedPlaceTypes) {
    selectedPlaceTypeIdx = USA_PLACE_HIERARCHY.indexOf(selectedPlaceTypes[0]);
  }
  const enclosedPlaceTypeIdx = USA_PLACE_HIERARCHY.indexOf(enclosedPlaceType);
  if (selectedPlaceTypeIdx < 0 || enclosedPlaceTypeIdx < 0) {
    return true;
  }
  return enclosedPlaceTypeIdx - selectedPlaceTypeIdx < 2;
}

/**
 * Returns whether a place is a child place of another place
 * @param selectedPlaceDcid dcid of the place
 * @param parentPlaceDcid dcid of place to check if selected place is a child of
 * @param parentPlaces list of parents of the selected place
 */
export function isChildPlaceOf(
  selectedPlaceDcid: string,
  parentPlaceDcid: string,
  parentPlaces: NamedPlace[]
): boolean {
  return (
    selectedPlaceDcid === parentPlaceDcid ||
    parentPlaces.findIndex((parent) => parent.dcid === parentPlaceDcid) > -1
  );
}

/**
 * Transforms a string to Title Case.
 * @param str the string to transform.
 */
export function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b(\w)/g, (s) => s.toUpperCase());
}

/**
 * Given the dcid of a place, returns a promise with the rest of the place
 * information
 * @param placeDcid
 */
export function getNamedTypedPlace(
  placeDcid: string
): Promise<NamedTypedPlace> {
  if (placeDcid === EARTH_NAMED_TYPED_PLACE.dcid) {
    return Promise.resolve(EARTH_NAMED_TYPED_PLACE);
  }
  // TODO: do both these together in a new flask endpoint after new cache with
  // parents, name, and type information is added.
  const placeTypePromise = axios
    .get(`/api/place/type/${placeDcid}`)
    .then((resp) => resp.data);
  const placeNamePromise = axios
    .get(`/api/place/name?dcid=${placeDcid}`)
    .then((resp) => resp.data);
  return Promise.all([placeTypePromise, placeNamePromise])
    .then(([placeType, placeName]) => {
      const name = placeDcid in placeName ? placeName[placeDcid] : placeDcid;
      return { dcid: placeDcid, name, types: [placeType] };
    })
    .catch(() => {
      return { dcid: placeDcid, name: "", types: [] };
    });
}
