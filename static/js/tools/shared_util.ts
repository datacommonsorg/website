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

import _ from "lodash";

import { IPCC_PLACE_50_TYPE_DCID } from "../shared/constants";
import { Observation, StatMetadata } from "../shared/stat_types";
import { NamedPlace, NamedTypedPlace } from "../shared/types";
import { USA_PLACE_HIERARCHY } from "./map/util";

/**
 * Functions shared between tools components
 */

/**
 * Choose an Observation with date closest to the target date.
 */
export function getMatchingObservation(
  series: Observation[],
  targetDate: string
): Observation {
  if (_.isEmpty(series)) {
    return null;
  }
  for (let i = 0; i < series.length; i++) {
    const item = series[i];
    if (targetDate == item.date) {
      return item;
    } else if (targetDate < item.date) {
      if (i > 0) {
        return series[i - 1];
      }
    }
  }
  return series[series.length - 1];
}

/**
 * Returns true if the stat var is an IPCC predication model for temperature.
 */
export function isTemperaturePredictionModel(statVar: string): boolean {
  return (
    statVar.indexOf("_Temperature") > 0 &&
    statVar.indexOf("Difference") < 0 &&
    (statVar.indexOf("RCP") > 0 || statVar.indexOf("SSP") > 0)
  );
}

/**
 * Returns true if the stat var is an IPCC stat var with multiple measurement
 * methods (each representing a different computation model).
 */
export function isIpccStatVarWithMultipleModels(statVar: string): boolean {
  return (
    statVar.startsWith("PrecipitationRate") ||
    isTemperaturePredictionModel(statVar)
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
 * Compuate ratio for two sorted time series.
 *
 * Both numerator and denominator series are sorted. For each numerator point,
 * The denominator with the closest date is selected.
 *
 * @param num Numerator time series.
 * @param denom Denominator time series.
 *
 * @returns A list of Observations with the per capita calculation applied to its values.
 */
export function computeRatio(
  num: Observation[],
  denom: Observation[],
  scaling = 1
): Observation[] {
  if (!denom) {
    return [];
  }
  const result: Observation[] = [];
  let j = 0; // denominator position
  for (let i = 0; i < num.length; i++) {
    const numDate = Date.parse(num[i].date);
    const denomDate = Date.parse(denom[j].date);
    while (j < denom.length - 1 && numDate > denomDate) {
      const denomDateNext = Date.parse(denom[j + 1].date);
      const nextBetter =
        Math.abs(denomDateNext - numDate) < Math.abs(denomDate - numDate);
      if (nextBetter) {
        j++;
      } else {
        break;
      }
    }
    let val: number;
    if (denom[j].value == 0) {
      val = 0;
    } else {
      val = num[i].value / denom[j].value / scaling;
    }
    result.push({ date: num[i].date, value: val });
  }
  return result;
}
