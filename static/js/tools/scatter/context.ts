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
import { StatsVarNode } from "../statvar_menu/util";
import { NamedNode } from "../../shared/types";

interface Axis {
  // StatVar to plot for this axis
  statVar: StatsVarNode;
  // Human readable name of the StatVar
  name: string;
  // Whether to plot on log scale
  log: boolean;
  // Whether to plot per capita values
  perCapita: boolean;
}

const EmptyAxis: Axis = Object.freeze({
  statVar: {},
  name: "",
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
  setLog: Setter<boolean>;
  setPerCapita: Setter<boolean>;
}

interface PlaceInfo {
  // Place that encloses the child places to plot
  enclosingPlace: NamedNode;
  // Type of places to plot
  enclosedPlaceType: string;
  // Places to plot
  enclosedPlaces: Array<NamedNode>;
  // Only plot places with populations between these
  lowerBound: number;
  upperBound: number;
}

interface PlaceInfoWrapper {
  value: PlaceInfo;

  // Setters
  set: Setter<PlaceInfo>;
  setEnclosingPlace: Setter<NamedNode>;
  setEnclosedPlaceType: Setter<string>;
  setEnclosedPlaces: Setter<Array<NamedNode>>;
  setLowerBound: Setter<number>;
  setUpperBound: Setter<number>;
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

interface DateInfo {
  year: number;
  month: number;
  day: number;
}

interface DateInfoWrapper {
  value: DateInfo;

  // Setters
  set: Setter<DateInfo>;
  setYear: Setter<number>;
  setMonth: Setter<number>;
  setDay: Setter<number>;
}

const EmptyDate: DateInfo = Object.freeze({
  year: 0,
  month: 0,
  day: 0,
});

interface IsLoadingWrapper {
  // Whether child places and their names are being retrieved
  arePlacesLoading: boolean;
  // Whether valid statvars are being retrieved for filtering the statvar menu
  areStatVarsLoading: boolean;
  // Whether population and statvar data are being retrieved for plotting
  areDataLoading: boolean;

  // Setters
  setArePlacesLoading: Setter<boolean>;
  setAreStatVarsLoading: Setter<boolean>;
  setAreDataLoading: Setter<boolean>;
}

// Global app state
interface ContextType {
  // X axis
  x: AxisWrapper;
  // Y axis
  y: AxisWrapper;
  // Places to plot
  place: PlaceInfoWrapper;
  // Whether there are currently active network tasks
  isLoading: IsLoadingWrapper;
}

const Context = createContext({} as ContextType);

// For values are used as keys in URL hash
const FieldToAbbreviation = {
  // Axis fields
  statVarDcid: "sv",
  statVarPath: "svp",
  statVarDenominator: "svd",
  name: "svn",
  log: "l",
  perCapita: "pc",

  // PlaceInfo fields
  enclosingPlaceName: "epn",
  enclosingPlaceDcid: "epd",
  enclosedPlaceType: "ept",
  lowerBound: "lb",
  upperBound: "ub",

  // DateInfo fields
  year: "y",
  month: "m",
  day: "d",
};

/**
 * Hook that constructs an initial context.
 */
function useContextStore(): ContextType {
  const [x, setX] = useState(EmptyAxis);
  const [y, setY] = useState(EmptyAxis);
  const [place, setPlace] = useState(EmptyPlace);
  const [arePlacesLoading, setArePlacesLoading] = useState(false);
  const [areStatVarsLoading, setAreStatVarsLoading] = useState(false);
  const [areDataLoading, setAreDataLoading] = useState(false);
  return {
    x: {
      value: x,
      set: (axis) => setX(axis),
      setStatVar: getSetStatVar(x, setX),
      unsetStatVar: getUnsetStatVar(x, setX),
      setStatVarName: getSetStatVarName(x, setX),
      setLog: getSetLog(x, setX),
      setPerCapita: getSetPerCapita(x, setX),
    },
    y: {
      value: y,
      set: (axis) => setY(axis),
      setStatVar: getSetStatVar(y, setY),
      unsetStatVar: getUnsetStatVar(y, setY),
      setStatVarName: getSetStatVarName(y, setY),
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
    isLoading: {
      arePlacesLoading: arePlacesLoading,
      areStatVarsLoading: areStatVarsLoading,
      areDataLoading: areDataLoading,
      setArePlacesLoading: setArePlacesLoading,
      setAreStatVarsLoading: setAreStatVarsLoading,
      setAreDataLoading: setAreDataLoading,
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
): Setter<NamedNode> {
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
): Setter<Array<NamedNode>> {
  return (enclosedPlaces) =>
    setPlace({
      ...place,
      enclosedPlaces: enclosedPlaces,
    });
}

/**
 * Returns a setter for the statvar for an axis and additionally
 * clearing the name of the statvar.
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
    });
  };
}

/**
 * Returns a setter for an axis that clears the statvar and the name
 * of the statvar.
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
  PlaceInfo,
  PlaceInfoWrapper,
  DateInfo,
  DateInfoWrapper,
  IsLoadingWrapper,
  EmptyAxis,
  EmptyPlace,
  EmptyDate,
  FieldToAbbreviation,
};
