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

interface Place {
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

interface ContextFieldType<V> {
  value: V;
  set: Setter<V>;
}

// Global app state
interface ContextType {
  // X axis
  x: ContextFieldType<Axis>;
  // Y axis
  y: ContextFieldType<Axis>;
  // Places to plot
  place: ContextFieldType<Place>;
}

const Context = createContext({} as ContextType);

function useStore(): ContextType {
  const [x, setX] = useState(EmptyAxis);
  const [y, setY] = useState(EmptyAxis);
  const [place, setPlace] = useState({
    enclosingPlace: {},
    enclosedPlaceType: "",
    enclosedPlaces: [],
    lowerBound: 0,
    upperBound: 1e10,
  } as Place);
  return {
    x: { value: x, set: setX },
    y: { value: y, set: setY },
    place: { value: place, set: setPlace },
  };
}

function setAxis(field: ContextFieldType<Axis>, axis: Axis): void {
  field.set(axis);
}

function setPlace(field: ContextFieldType<Place>, place: Place): void {
  field.set(place);
}

function setStatVar(axis: ContextFieldType<Axis>, statVar: StatsVarNode): void {
  axis.set({
    ...axis.value,
    statVar: statVar,
    name: "",
    populations: [],
    data: [],
  });
}

function setStatVarName(axis: ContextFieldType<Axis>, name: string): void {
  axis.set({
    ...axis.value,
    name: name,
  });
}

function unsetStatVar(axis: ContextFieldType<Axis>): void {
  axis.set({
    ...axis.value,
    statVar: {},
    name: "",
    populations: [],
    data: [],
  });
}

function setData(axis: ContextFieldType<Axis>, data: Array<number>): void {
  axis.set({ ...axis.value, data: data });
}

function setPopulations(
  axis: ContextFieldType<Axis>,
  populations: Array<number>
): void {
  axis.set({ ...axis.value, populations: populations });
}

export {
  Context,
  useStore,
  ContextType,
  ContextFieldType,
  Axis,
  NamedPlace,
  Place,
  setAxis,
  setPlace,
  setStatVar,
  setStatVarName,
  unsetStatVar,
  setData,
  setPopulations,
  EmptyAxis,
};
