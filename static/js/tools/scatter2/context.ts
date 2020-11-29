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

interface AxisWrapper {
  value: Axis;

  // Setters
  set(axis: Axis): void;
  setStatVar(statVar: StatsVarNode): void;
  unsetStatVar(): void;
  setStatVarName(name: string): void;
  unsetPopulationsAndData(): void;
  setData(data: Array<number>): void;
  setPopulations(populations: Array<number>): void;
  setLog(log: boolean): void;
  setPerCapita(perCapita: boolean): void;
}

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

interface PlaceInfoWrapper {
  value: PlaceInfo;

  // Setters
  set(place: PlaceInfo): void;
  setEnclosingPlace(place: NamedPlace): void;
  setEnclosedPlaceType(enclosedPlaceType: string): void;
  setEnclosedPlaces(enclosedPlaces: Array<NamedPlace>): void;
  setLowerBound(lowerBound: number): void;
  setUpperBound(upperBound: number): void;
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

// Global app state
interface ContextType {
  // X axis
  x: AxisWrapper;
  // Y axis
  y: AxisWrapper;
  // Places to plot
  place: PlaceInfoWrapper;
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
    x: {
      value: x,
      set: (axis) => setX(axis),
      setStatVar: getSetStatVar(x, setX),
      unsetStatVar: getUnsetStatVar(x, setX),
      setStatVarName: getSetStatVarName(x, setX),
      unsetPopulationsAndData: getUnsetPopulationsAndData(x, setX),
      setData: getSetData(x, setX),
      setPopulations: getSetPopulations(x, setX),
      setLog: getSetLog(x, setX),
      setPerCapita: getSetPerCapita(x, setX),
    },
    y: {
      value: y,
      set: (axis) => setY(axis),
      setStatVar: getSetStatVar(y, setY),
      unsetStatVar: getUnsetStatVar(y, setY),
      setStatVarName: getSetStatVarName(y, setY),
      unsetPopulationsAndData: getUnsetPopulationsAndData(y, setY),
      setData: getSetData(y, setY),
      setPopulations: getSetPopulations(y, setY),
      setLog: getSetLog(y, setY),
      setPerCapita: getSetPerCapita(y, setY),
    },
    place: {
      value: place,
      set: (place) => setPlace(place),
      setEnclosingPlace: getSetEnclosingPlace(place, setPlace),
      setEnclosedPlaceType: getSetEnclosedPlaceType(place, setPlace),
      setEnclosedPlaces: getSetEnclosedPlaces(place, setPlace),
      setLowerBound: getSetLowerBound(place, setPlace),
      setUpperBound: getSetUpperBound(place, setPlace),
    },
  };
}

function getSetEnclosingPlace(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): (enclosingPlace: NamedPlace) => void {
  return (enclosingPlace) =>
    setPlace({
      ...place,
      enclosedPlaces: [],
      enclosingPlace: enclosingPlace,
    });
}

/**
 * Sets the child place type and clears the child places.
 * @param field
 * @param enclosedPlaceType
 */
function getSetEnclosedPlaceType(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): (enclosedPlaceType: string) => void {
  return (enclosedPlaceType) =>
    setPlace({
      ...place,
      enclosedPlaceType: enclosedPlaceType,
      enclosedPlaces: [],
    });
}

function getSetEnclosedPlaces(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): (enclosedPlaces: Array<NamedPlace>) => void {
  return (enclosedPlaces) =>
    setPlace({
      ...place,
      enclosedPlaces: enclosedPlaces,
    });
}

/**
 * Sets the statvar for an axis and clears its name and data and
 * the population data for that axis.
 * @param axis
 * @param statVar
 */
function getSetStatVar(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): (statVar: StatsVarNode) => void {
  return (statVar) => {
    setAxis({
      ...axis,
      statVar: statVar,
      name: "",
      populations: [],
      data: [],
    });
  };
}

function getUnsetStatVar(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): () => void {
  return () => {
    setAxis({
      ...axis,
      statVar: {},
      name: "",
      populations: [],
      data: [],
    });
  };
}

function getSetStatVarName(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): (name: string) => void {
  return (name) => {
    setAxis({
      ...axis,
      name: name,
    });
  };
}

function getUnsetPopulationsAndData(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): () => void {
  return () => {
    setAxis({
      ...axis,
      data: [],
      populations: [],
    });
  };
}

function getSetData(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): (data: Array<number>) => void {
  return (data) => {
    setAxis({ ...axis, data: data });
  };
}

function getSetPopulations(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): (populations: Array<number>) => void {
  return (populations) => {
    setAxis({
      ...axis,
      populations: populations,
    });
  };
}

function getSetLog(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): (log: boolean) => void {
  return (log) => {
    setAxis({
      ...axis,
      log: log,
    });
  };
}

function getSetPerCapita(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): (perCapita: boolean) => void {
  return (perCapita) => {
    setAxis({
      ...axis,
      perCapita: perCapita,
    });
  };
}

function getSetLowerBound(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): (lowerBound: number) => void {
  return (lowerBound) =>
    setPlace({
      ...place,
      lowerBound: lowerBound,
    });
}

function getSetUpperBound(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): (upperBound: number) => void {
  return (upperBound) =>
    setPlace({
      ...place,
      upperBound: upperBound,
    });
}

export {
  Context,
  useContextStore,
  ContextType,
  Axis,
  AxisWrapper,
  NamedPlace,
  PlaceInfo,
  PlaceInfoWrapper,
  EmptyAxis,
  EmptyPlace,
};
