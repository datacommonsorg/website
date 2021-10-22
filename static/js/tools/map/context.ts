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

import { createContext, useState } from "react";

import { StatVarInfo } from "../../shared/stat_var";
import { NamedPlace } from "../../shared/types";
import { applyHashDisplay, applyHashPlaceInfo, applyHashStatVar } from "./util";

/**
 * Global app context for map explorer tool.
 */

// used to set fields in context
interface Setter<T> {
  (value: T): void;
}

// Place with name and its type.
export interface NamedTypedPlace {
  dcid: string;
  name: string;
  types: Array<string>;
}

// Information relating to the stat var to plot
export interface StatVar {
  // additional information about the chosen stat var
  info: StatVarInfo;
  // dcid of the chosen stat var
  dcid: string;
  // Whether to plot per capita values
  perCapita: boolean;
  // date of the stat var data to get
  date: string;
}

// Wraps StatVarInfo with its setters
export interface StatVarWrapper {
  value: StatVar;

  set: Setter<StatVar>;
  setInfo: Setter<StatVarInfo>;
  setDcid: Setter<string>;
  setPerCapita: Setter<boolean>;
  setDate: Setter<string>;
}

// Information relating to the places to plot
export interface PlaceInfo {
  // The current place that has been selected
  selectedPlace: NamedTypedPlace;
  // The parent places of the selected place
  parentPlaces: Array<NamedTypedPlace>;
  // Place that encloses the places to plot
  enclosingPlace: NamedPlace;
  // The type of place to plot
  enclosedPlaceType: string;
  // The places to plot
  enclosedPlaces: Array<NamedPlace>;
  // The type of place to show points on the map for
  mapPointsPlaceType: string;
}

// Wraps PlaceInfo with its setters
export interface PlaceInfoWrapper {
  value: PlaceInfo;

  set: Setter<PlaceInfo>;
  setSelectedPlace: Setter<NamedTypedPlace>;
  setParentPlaces: Setter<Array<NamedTypedPlace>>;
  setEnclosingPlace: Setter<NamedPlace>;
  setEnclosedPlaceType: Setter<string>;
  setEnclosedPlaces: Setter<Array<NamedPlace>>;
  setMapPointsPlaceType: Setter<string>;
}

// Information relating to things loading
export interface IsLoading {
  // Whether geojson and stat var data are being retrieved for plotting
  isDataLoading: boolean;
  // Whether child places are being retrieved
  isPlaceInfoLoading: boolean;
}

// Wraps IsLoading with its setters
export interface IsLoadingWrapper {
  value: IsLoading;

  set: Setter<IsLoading>;
  setIsDataLoading: Setter<boolean>;
  setIsPlaceInfoLoading: Setter<boolean>;
}

// Information relating to how the map is displayed
export interface DisplayOptions {
  // middle color to use for the scale for the map
  color: string;
  // domain to use for the scale. First number is the min, second number is the
  // value that will correspond to the middle color, and the last number is the
  // max.
  domain: [number, number, number];
}

export interface ContextType {
  statVar: StatVarWrapper;
  placeInfo: PlaceInfoWrapper;
  isLoading: IsLoadingWrapper;
  display: { value: DisplayOptions; set: Setter<DisplayOptions> };
}

export const Context = createContext({} as ContextType);

export function getInitialContext(params: URLSearchParams): ContextType {
  const [statVar, setStatVar] = useState(applyHashStatVar(params));
  const [placeInfo, setPlaceInfo] = useState(applyHashPlaceInfo(params));
  const [isLoading, setIsLoading] = useState({
    isDataLoading: false,
    isPlaceInfoLoading: false,
  });
  const [display, setDisplay] = useState(applyHashDisplay(params));
  return {
    isLoading: {
      value: isLoading,
      set: (isLoading) => setIsLoading(isLoading),
      setIsDataLoading: (isDataLoading) =>
        setIsLoading({ ...isLoading, isDataLoading }),
      setIsPlaceInfoLoading: (isPlaceInfoLoading) =>
        setIsLoading({ ...isLoading, isPlaceInfoLoading }),
    },
    placeInfo: {
      value: placeInfo,
      set: (placeInfo) => setPlaceInfo(placeInfo),
      setSelectedPlace: (selectedPlace) =>
        setPlaceInfo({
          ...placeInfo,
          selectedPlace,
          enclosedPlaces: [],
          enclosedPlaceType: "",
          parentPlaces: null,
          enclosingPlace: { dcid: "", name: "" },
        }),
      setEnclosingPlace: (enclosingPlace) =>
        setPlaceInfo({
          ...placeInfo,
          enclosingPlace,
          enclosedPlaces: [],
        }),
      setEnclosedPlaceType: (enclosedPlaceType) =>
        setPlaceInfo({
          ...placeInfo,
          enclosingPlace: { dcid: "", name: "" },
          enclosedPlaces: [],
          enclosedPlaceType,
          parentPlaces: null,
        }),
      setEnclosedPlaces: (enclosedPlaces) =>
        setPlaceInfo({ ...placeInfo, enclosedPlaces }),
      setParentPlaces: (parentPlaces) =>
        setPlaceInfo({ ...placeInfo, parentPlaces }),
      setMapPointsPlaceType: (mapPointsPlaceType) =>
        setPlaceInfo({ ...placeInfo, mapPointsPlaceType }),
    },
    statVar: {
      value: statVar,
      set: (statVar) => setStatVar(statVar),
      setDcid: (dcid) => setStatVar({ ...statVar, dcid, info: null }),
      setInfo: (info) => setStatVar({ ...statVar, info }),
      setPerCapita: (perCapita) => setStatVar({ ...statVar, perCapita }),
      setDate: (date) => setStatVar({ ...statVar, date }),
    },
    display: {
      value: display,
      set: (display) => setDisplay(display),
    },
  };
}
