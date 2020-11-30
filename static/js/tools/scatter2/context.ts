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

const emptyAxis: Axis = Object.freeze({
  statVar: {},
  name: "",
  data: [],
  populations: [],
  log: false,
  perCapita: false,
});

interface Setter<T> {
  (value: T): void;
}

interface AxisWrapper {
  value: Axis;

  // Setters
  set: Setter<Axis>;
  setStatVar: Setter<StatsVarNode>;
  unsetStatVar: Setter<void>;
  setStatVarName: Setter<string>;
  unsetPopulationsAndData: Setter<void>;
  setData: Setter<Array<number>>;
  setPopulations: Setter<Array<number>>;
  setLog: Setter<boolean>;
  setPerCapita: Setter<boolean>;
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
  set: Setter<PlaceInfo>;
  setEnclosingPlace: Setter<NamedPlace>;
  setEnclosedPlaceType: Setter<string>;
  setEnclosedPlaces: Setter<Array<NamedPlace>>;
  setLowerBound: Setter<number>;
  setUpperBound: Setter<number>;
}

const emptyPlace: PlaceInfo = Object.freeze({
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
 * Hook that constructs an initial context.
 */
function useContextStore(): ContextType {
  const [x, setX] = useState(emptyAxis);
  const [y, setY] = useState(emptyAxis);
  const [place, setPlace] = useState(emptyPlace);
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

/**
 * Returns a setter for the parent place and additionally
 * clearing the child places.
 * @param place
 * @param setPlace
 */
function getSetEnclosingPlace(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): Setter<NamedPlace> {
  return (enclosingPlace) =>
    setPlace({
      ...place,
      enclosedPlaces: [],
      enclosingPlace: enclosingPlace,
    });
}

/**
 * Returns a setter for child place type and additionally
 * clearing the child places.
 * @param place
 * @param setPlace
 */
function getSetEnclosedPlaceType(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): Setter<string> {
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
): Setter<Array<NamedPlace>> {
  return (enclosedPlaces) =>
    setPlace({
      ...place,
      enclosedPlaces: enclosedPlaces,
    });
}

/**
 * Returns a setter for the statvar for an axis and additionally
 * clearing its name and data and the population data for that axis.
 * @param axis
 * @param setAxis
 */
function getSetStatVar(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<StatsVarNode> {
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

/**
 * Returns a setter for an axis that clears the statvar, the name
 * of the statvar, the data for the statvar, and the population
 * data for the statvar.
 * @param axis
 * @param setAxis
 */
function getUnsetStatVar(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<void> {
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
): Setter<string> {
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
): Setter<void> {
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
): Setter<Array<number>> {
  return (data) => {
    setAxis({ ...axis, data: data });
  };
}

function getSetPopulations(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<Array<number>> {
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
): Setter<boolean> {
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
): Setter<boolean> {
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
): Setter<number> {
  return (lowerBound) =>
    setPlace({
      ...place,
      lowerBound: lowerBound,
    });
}

function getSetUpperBound(
  place: PlaceInfo,
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): Setter<number> {
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
  emptyAxis,
  emptyPlace,
};
