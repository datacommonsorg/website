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
 * Global app context.
 */

import { createContext, useState } from "react";
import { StatsVarNode } from "../timeline_util";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface Axis {
  // StatVar to plot for this axis
  statVar: StatsVarNode;
  // Human readable name of the StatVar
  name: string;
  // Data points
  data: Array<number>;
  // Populations for per capita
  populations: Array<number>;
  // Whether to plot on log scale
  log: boolean;
  // Whether to plot per capita values
  perCapita: boolean;
}

const EmptyAxis: Axis = Object.freeze({
  statVar: {},
  name: "",
  data: [],
  populations: [],
  log: false,
  perCapita: false,
});

interface NamedPlace {
  name: string;
  dcid: string;
}

interface PlaceInfo {
  // Place that encloses the child places to plot
  enclosingPlace: NamedPlace;
  // Type of places to plot
  enclosedPlaceType: string;
  // Places to plot
  enclosedPlaces: Array<NamedPlace>;
  // Only plot places with populations between these
  lowerBound: number;
  upperBound: number;
}

const EmptyPlace: PlaceInfo = Object.freeze({
  enclosingPlace: {
    name: "",
    dcid: "",
  },
  enclosedPlaceType: "",
  enclosedPlaces: [],
  lowerBound: 0,
  upperBound: 1e10,
});

interface StateType<V> {
  value: V;
  set: Setter<V>;
}

// Global app state
interface ContextType {
  // X axis
  x: StateType<Axis>;
  // Y axis
  y: StateType<Axis>;
  // Places to plot
  place: StateType<PlaceInfo>;
}

const Context = createContext({} as ContextType);

/**
 * Constructs an initial context.
 */
function useContextStore(): ContextType {
  const [x, setX] = useState(EmptyAxis);
  const [y, setY] = useState(EmptyAxis);
  const [place, setPlace] = useState(EmptyPlace);
  return {
    x: { value: x, set: setX },
    y: { value: y, set: setY },
    place: { value: place, set: setPlace },
  };
}

function setAxis(field: StateType<Axis>, axis: Axis): void {
  field.set(axis);
}

function setPlace(field: StateType<PlaceInfo>, place: PlaceInfo): void {
  field.set(place);
}

/**
 * Sets the enclosing place and clears the child places.
 * @param field
 * @param place
 */
function setEnclosingPlace(
  field: StateType<PlaceInfo>,
  place: NamedPlace
): void {
  field.set({
    ...field.value,
    enclosedPlaces: [],
    enclosingPlace: place,
  });
}

/**
 * Sets the child place type and clears the child places.
 * @param field
 * @param enclosedPlaceType
 */
function setEnclosedPlaceType(
  field: StateType<PlaceInfo>,
  enclosedPlaceType: string
): void {
  field.set({
    ...field.value,
    enclosedPlaceType: enclosedPlaceType,
    enclosedPlaces: [],
  });
}

function setEnclosedPlaces(
  field: StateType<PlaceInfo>,
  enclosedPlaces: Array<NamedPlace>
): void {
  field.set({
    ...field.value,
    enclosedPlaces: enclosedPlaces,
  });
}

/**
 * Sets the statvar for an axis and clears its name and data and
 * the population data for that axis.
 * @param axis
 * @param statVar
 */
function setStatVar(axis: StateType<Axis>, statVar: StatsVarNode): void {
  axis.set({
    ...axis.value,
    statVar: statVar,
    name: "",
    populations: [],
    data: [],
  });
}

function unsetStatVar(axis: StateType<Axis>): void {
  setStatVar(axis, {});
}

function setStatVarName(axis: StateType<Axis>, name: string): void {
  axis.set({
    ...axis.value,
    name: name,
  });
}

function unsetPopulationsAndData(axis: StateType<Axis>): void {
  axis.set({
    ...axis.value,
    data: [],
    populations: [],
  });
}

function setData(axis: StateType<Axis>, data: Array<number>): void {
  axis.set({ ...axis.value, data: data });
}

function setPopulations(
  axis: StateType<Axis>,
  populations: Array<number>
): void {
  axis.set({ ...axis.value, populations: populations });
}

function setLog(axis: StateType<Axis>, log: boolean): void {
  axis.set({ ...axis.value, log: log });
}

function setPerCapita(axis: StateType<Axis>, perCapita: boolean): void {
  axis.set({ ...axis.value, perCapita: perCapita });
}

function setLowerBound(place: StateType<PlaceInfo>, bound: number): void {
  place.set({ ...place.value, lowerBound: bound });
}

function setUpperBound(place: StateType<PlaceInfo>, bound: number): void {
  place.set({ ...place.value, upperBound: bound });
}

export {
  Context,
  useContextStore,
  ContextType,
  StateType,
  Axis,
  NamedPlace,
  PlaceInfo,
  setAxis,
  setPlace,
  setEnclosingPlace,
  setEnclosedPlaceType,
  setEnclosedPlaces,
  setStatVar,
  setStatVarName,
  unsetStatVar,
  unsetPopulationsAndData,
  setData,
  setPopulations,
  setLog,
  setPerCapita,
  setLowerBound,
  setUpperBound,
  EmptyAxis,
  EmptyPlace,
};
