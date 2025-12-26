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

import { StatVarInfo, StatVarNode } from "../../shared/stat_var";
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { Setter } from "../../shared/util";
import {
  applyHashAxis,
  applyHashBoolean,
  applyHashPlace,
  applyHashPopulation,
  ScatterChartType,
} from "./util";

type PointScaleState = "linear" | "log" | "";
const SHOW_POPULATION_LINEAR: PointScaleState = "linear";
const SHOW_POPULATION_LOG: PointScaleState = "log";
const SHOW_POPULATION_OFF: PointScaleState = "";

interface Axis {
  // Additional info about the StatVar to plot for this axis
  statVarInfo: StatVarInfo;
  // Dcid of the StatVar to plot for this axis
  statVarDcid: string;
  // Whether to plot on log scale
  log: boolean;
  // Whether to plot per capita values
  perCapita: boolean;
  // The date of the StatVar data to plot for this axis
  date: string;
  // The metahash of the source to get data from
  metahash: string;
  // The dcid of the stat var to use to calculate ratio of
  denom: string;
}

const EmptyAxis: Axis = Object.freeze({
  statVarInfo: null,
  statVarDcid: "",
  log: false,
  perCapita: false,
  date: "",
  metahash: "",
  denom: "",
});

interface AxisWrapper {
  value: Axis;

  // Setters
  set: Setter<Axis>;
  setStatVarDcid: Setter<string>;
  unsetStatVarDcid: Setter<void>;
  setStatVarInfo: Setter<StatVarInfo>;
  setLog: Setter<boolean>;
  setPerCapita: Setter<boolean>;
  setDate: Setter<string>;
  setMetahash: Setter<string>;
  setDenom: Setter<string>;
}

interface PlaceInfo {
  // Place that encloses the child places to plot
  enclosingPlace: NamedTypedPlace;
  // Type of places to plot
  enclosedPlaceType: string;
  // Places to plot
  enclosedPlaces: Array<NamedPlace>;
  // The parent places of the selected place
  parentPlaces: Array<NamedTypedPlace>;
}

interface PlaceInfoWrapper {
  value: PlaceInfo;

  // Setters
  set: Setter<PlaceInfo>;
  setEnclosingPlace: Setter<NamedTypedPlace>;
  setEnclosedPlaceType: Setter<string>;
  setEnclosedPlaces: Setter<Array<NamedPlace>>;
  setParentPlaces: Setter<Array<NamedTypedPlace>>;
}

const EmptyPlace: PlaceInfo = Object.freeze({
  enclosingPlace: {
    name: "",
    dcid: "",
    types: null,
  },
  enclosedPlaceType: "",
  enclosedPlaces: null,
  parentPlaces: null,
});

interface DisplayOptionsWrapper {
  showQuadrants: boolean;
  showLabels: boolean;
  chartType: ScatterChartType;
  showDensity: boolean;
  showPopulation: PointScaleState;
  showRegression: boolean;

  // Setters
  setQuadrants: Setter<boolean>;
  setLabels: Setter<boolean>;
  setChartType: Setter<ScatterChartType>;
  setDensity: Setter<boolean>;
  setPopulation: Setter<PointScaleState>;
  setRegression: Setter<boolean>;
}

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
  date: "date",
  metahash: "src",
  denom: "d",

  // PlaceInfo fields
  enclosingPlaceDcid: "epd",
  enclosedPlaceType: "ept",

  // DisplayOptions fields
  showQuadrant: "qd",
  showLabels: "ld",
  chartType: "ct",
  showDensity: "dd",
  showPopulation: "pp",
  showRegression: "rg",
};

/**
 * Hook that constructs an initial context.
 * If a hash parameter value is provided, will use those value in the returned context.
 *
 * @param params URL hash parameter values to use in the context
 */
function useContextStore(params: URLSearchParams): ContextType {
  const [x, setX] = useState(applyHashAxis(params, true));
  const [y, setY] = useState(applyHashAxis(params, false));
  const [place, setPlace] = useState(applyHashPlace(params));
  const [showQuadrants, setQuadrants] = useState(
    applyHashBoolean(params, FieldToAbbreviation.showQuadrant)
  );
  const [showLabels, setLabels] = useState(
    applyHashBoolean(params, FieldToAbbreviation.showLabels)
  );
  const [showDensity, setDensity] = useState(
    applyHashBoolean(params, FieldToAbbreviation.showDensity)
  );
  const [showPopulation, setPopulation] = useState(applyHashPopulation(params));
  const [arePlacesLoading, setArePlacesLoading] = useState(false);
  const [areStatVarsLoading, setAreStatVarsLoading] = useState(false);
  const [areDataLoading, setAreDataLoading] = useState(false);
  const initialChartState =
    params.get(FieldToAbbreviation.chartType) === "1"
      ? ScatterChartType.MAP
      : ScatterChartType.SCATTER;
  const [chartType, setChartType] = useState(initialChartState);
  const [showRegression, setRegression] = useState(
    applyHashBoolean(params, FieldToAbbreviation.showRegression)
  );
  return {
    x: {
      value: x,
      set: (axis) => setX(axis),
      setStatVarDcid: getSetStatVarDcid(setX),
      unsetStatVarDcid: getUnsetStatVarDcid(setX),
      setStatVarInfo: getSetStatVarInfo(setX),
      setLog: getSetLog(setX),
      setPerCapita: getSetPerCapita(setX),
      setDate: getSetDate(setX),
      setMetahash: (metahash) => setX((prev) => ({ ...prev, metahash })),
      setDenom: (denom) => setX((prev) => ({ ...prev, denom })),
    },
    y: {
      value: y,
      set: (axis) => setY(axis),
      setStatVarDcid: getSetStatVarDcid(setY),
      unsetStatVarDcid: getUnsetStatVarDcid(setY),
      setStatVarInfo: getSetStatVarInfo(setY),
      setLog: getSetLog(setY),
      setPerCapita: getSetPerCapita(setY),
      setDate: getSetDate(setY),
      setMetahash: (metahash) => setY((prev) => ({ ...prev, metahash })),
      setDenom: (denom) => setY((prev) => ({ ...prev, denom })),
    },
    place: {
      value: place,
      set: (place) => setPlace(place),
      setEnclosingPlace: getSetEnclosingPlace(setPlace),
      setEnclosedPlaceType: getSetEnclosedPlaceType(setPlace),
      setEnclosedPlaces: getSetEnclosedPlaces(setPlace),
      setParentPlaces: (parentPlaces) =>
        setPlace((prev) => ({ ...prev, parentPlaces })),
    },
    display: {
      showQuadrants,
      setQuadrants: (showQuadrants) => setQuadrants(showQuadrants),
      showLabels,
      setLabels: (showLabels) => setLabels(showLabels),
      chartType,
      setChartType: (chartType) => setChartType(chartType),
      showDensity,
      setDensity: (showDensity) => setDensity(showDensity),
      showPopulation,
      setPopulation: (showPopulation) => setPopulation(showPopulation),
      showRegression,
      setRegression: (showRegression) => setRegression(showRegression),
    },
    isLoading: {
      areDataLoading,
      arePlacesLoading,
      areStatVarsLoading,
      setAreDataLoading,
      setArePlacesLoading,
      setAreStatVarsLoading,
    },
  };
}

/**
 * Returns a setter for the parent place and additionally
 * clearing the child places.
 * @param setPlace
 */
function getSetEnclosingPlace(
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): Setter<NamedTypedPlace> {
  return (enclosingPlace) =>
    setPlace((prevPlace) => ({
      ...prevPlace,
      enclosedPlaces: [],
      enclosingPlace,
      parentPlaces: null,
      enclosedPlaceType:
        prevPlace.enclosingPlace.dcid !== enclosingPlace.dcid
          ? ""
          : prevPlace.enclosedPlaceType,
    }));
}

/**
 * Returns a setter for child place type and additionally
 * clearing the child places.
 * @param setPlace
 */
function getSetEnclosedPlaceType(
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): Setter<string> {
  return (enclosedPlaceType) =>
    setPlace((prevPlace) => ({
      ...prevPlace,
      enclosedPlaceType,
      enclosedPlaces: [],
    }));
}

function getSetEnclosedPlaces(
  setPlace: React.Dispatch<React.SetStateAction<PlaceInfo>>
): Setter<Array<NamedPlace>> {
  return (enclosedPlaces) =>
    setPlace((prevPlace) => ({
      ...prevPlace,
      enclosedPlaces,
    }));
}

/**
 * Returns a setter for the statvar for an axis and additionally
 * clearing the name of the statvar.
 * @param setAxis
 */
function getSetStatVarInfo(
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<StatVarNode> {
  return (statVarInfo) => {
    setAxis((prevAxis) => ({
      ...prevAxis,
      statVarInfo,
    }));
  };
}

/**
 * Returns a setter for an axis that clears the statvar and the name
 * of the statvar.
 * @param setAxis
 */
function getUnsetStatVarDcid(
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<void> {
  return () => {
    setAxis((prevAxis) => ({
      ...prevAxis,
      statVarDcid: "",
      statVarInfo: null,
    }));
  };
}

function getSetStatVarDcid(
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<string> {
  return (dcid) => {
    setAxis((prevAxis) => ({
      ...prevAxis,
      statVarDcid: dcid,
      statVarInfo: null,
    }));
  };
}

function getSetLog(
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<boolean> {
  return (log) => {
    setAxis((prevAxis) => ({
      ...prevAxis,
      log,
    }));
  };
}

function getSetPerCapita(
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<boolean> {
  return (perCapita) => {
    setAxis((prevAxis) => ({
      ...prevAxis,
      perCapita,
    }));
  };
}

function getSetDate(
  setAxis: React.Dispatch<React.SetStateAction<Axis>>
): Setter<string> {
  return (date) => {
    setAxis((prevAxis) => ({
      ...prevAxis,
      date,
    }));
  };
}

export {
  Axis,
  AxisWrapper,
  Context,
  ContextType,
  DisplayOptionsWrapper,
  EmptyAxis,
  EmptyPlace,
  FieldToAbbreviation,
  IsLoadingWrapper,
  PlaceInfo,
  PlaceInfoWrapper,
  PointScaleState,
  SHOW_POPULATION_LINEAR,
  SHOW_POPULATION_LOG,
  SHOW_POPULATION_OFF,
  useContextStore,
};
