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

import { StatVarInfo, StatVarNode } from "../../shared/stat_var";
import { createContext, useState } from "react";

import { NamedPlace } from "../../shared/types";

interface Axis {
  // Additional info about the StatVar to plot for this axis
  statVarInfo: StatVarInfo;
  // Dcid of the StatVar to plot for this axis
  statVarDcid: string;
  // Whether to plot on log scale
  log: boolean;
  // Whether to plot per capita values
  perCapita: boolean;
}

const EmptyAxis: Axis = Object.freeze({
  statVarInfo: null,
  statVarDcid: "",
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
  setStatVarDcid: Setter<string>;
  unsetStatVarDcid: Setter<void>;
  setStatVarInfo: Setter<StatVarInfo>;
  setLog: Setter<boolean>;
  setPerCapita: Setter<boolean>;
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

interface DisplayOptionsWrapper {
  showQuadrants: boolean;
  showLabels: boolean;
  showDensity: boolean;

  // Setters
  setQuadrants: Setter<boolean>;
  setLabels: Setter<boolean>;
  setDensity: Setter<boolean>;
}

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
  // Plot display options
  display: DisplayOptionsWrapper;
  // Whether there are currently active network tasks
  isLoading: IsLoadingWrapper;
}

const Context = createContext({} as ContextType);

// For values are used as keys in URL hash
const FieldToAbbreviation = {
  // Axis fields
  statVarDcid: "sv",
  log: "l",
  perCapita: "pc",

  // PlaceInfo fields
  enclosingPlaceName: "epn",
  enclosingPlaceDcid: "epd",
  enclosedPlaceType: "ept",
  lowerBound: "lb",
  upperBound: "ub",

  // DisplayOptions fields
  showQuadrant: "qd",
  showLabels: "ld",
  showDensity: "dd",
};

/**
 * Hook that constructs an initial context.
 */
function useContextStore(): ContextType {
  const [x, setX] = useState(EmptyAxis);
  const [y, setY] = useState(EmptyAxis);
  const [place, setPlace] = useState(EmptyPlace);
  const [showQuadrants, setQuadrants] = useState(false);
  const [showLabels, setLabels] = useState(false);
  const [showDensity, setDensity] = useState(false);
  const [arePlacesLoading, setArePlacesLoading] = useState(false);
  const [areStatVarsLoading, setAreStatVarsLoading] = useState(false);
  const [areDataLoading, setAreDataLoading] = useState(false);
  return {
    x: {
      value: x,
      set: (axis) => setX(axis),
      setStatVarDcid: getSetStatVarDcid(x, setX),
      unsetStatVarDcid: getUnsetStatVarDcid(x, setX),
      setStatVarInfo: getSetStatVarInfo(x, setX),
      setLog: getSetLog(x, setX),
      setPerCapita: getSetPerCapita(x, setX),
    },
    y: {
      value: y,
      set: (axis) => setY(axis),
      setStatVarDcid: getSetStatVarDcid(y, setY),
      unsetStatVarDcid: getUnsetStatVarDcid(y, setY),
      setStatVarInfo: getSetStatVarInfo(y, setY),
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
    display: {
      showQuadrants: showQuadrants,
      setQuadrants: (showQuadrants) => setQuadrants(showQuadrants),
      showLabels: showLabels,
      setLabels: (showLabels) => setLabels(showLabels),
      showDensity: showDensity,
      setDensity: (showDensity) => setDensity(showDensity),
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
 * clearing the name of the statvar.
 * @param axis
 * @param setAxis
 */
function getSetStatVarInfo(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<StatVarNode> {
  return (statVarInfo) => {
    setAxis({
      ...axis,
      statVarInfo: statVarInfo,
    });
  };
}

/**
 * Returns a setter for an axis that clears the statvar and the name
 * of the statvar.
 * @param axis
 * @param setAxis
 */
function getUnsetStatVarDcid(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<void> {
  return () => {
    setAxis({
      ...axis,
      statVarDcid: "",
      statVarInfo: null,
    });
  };
}

function getSetStatVarDcid(
  axis: Axis,
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<string> {
  return (dcid) => {
    setAxis({
      ...axis,
      statVarDcid: dcid,
      statVarInfo: null,
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
  DisplayOptionsWrapper,
  EmptyAxis,
  EmptyPlace,
  EmptyDate,
  FieldToAbbreviation,
};
