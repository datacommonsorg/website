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
import { NamedPlace } from "../../shared/types";
import { StatsVarNode } from "../statvar_menu/util";
import { applyHashStatVarInfo, applyHashPlaceInfo } from "./util";

/**
 * Global app context for map explorer tool.
 */

// used to set fields in context
interface Setter<T> {
  (value: T): void;
}

// Information relating to the stat var to plot
export interface StatVarInfo {
  // The stat var to plot
  statVar: StatsVarNode;
  // Human readable name of the stat var
  name: string;
  // Whether to plot per capita values
  perCapita: boolean;
}

// Wraps StatVarInfo with its setters
export interface StatVarInfoWrapper {
  value: StatVarInfo;

  set: Setter<StatVarInfo>;
  setStatVar: Setter<StatsVarNode>;
  setStatVarName: Setter<string>;
  setPerCapita: Setter<boolean>;
}

// Information relating to the places to plot
export interface PlaceInfo {
  // Place that encloses the places to plot
  enclosingPlace: NamedPlace;
  // The type of place to plot
  enclosedPlaceType: string;
  // The places to plot
  enclosedPlaces: Array<string>;
}

// Wraps PlaceInfo with its setters
export interface PlaceInfoWrapper {
  value: PlaceInfo;

  set: Setter<PlaceInfo>;
  setEnclosingPlace: Setter<NamedPlace>;
  setEnclosedPlaceType: Setter<string>;
  setEnclosedPlaces: Setter<Array<string>>;
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

export interface ContextType {
  statVarInfo: StatVarInfoWrapper;
  placeInfo: PlaceInfoWrapper;
  isLoading: IsLoadingWrapper;
}

export const Context = createContext({} as ContextType);

export function getInitialContext(params: URLSearchParams): ContextType {
  const [statVarInfo, setStatVarInfo] = useState(applyHashStatVarInfo(params));
  const [placeInfo, setPlaceInfo] = useState(applyHashPlaceInfo(params));
  const [isLoading, setIsLoading] = useState({
    isDataLoading: false,
    isPlaceInfoLoading: false,
  });
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
      setEnclosingPlace: (enclosingPlace) =>
        setPlaceInfo({
          ...placeInfo,
          enclosingPlace,
          enclosedPlaces: [],
          enclosedPlaceType: "",
        }),
      setEnclosedPlaceType: (enclosedPlaceType) =>
        setPlaceInfo({ ...placeInfo, enclosedPlaces: [], enclosedPlaceType }),
      setEnclosedPlaces: (enclosedPlaces) =>
        setPlaceInfo({ ...placeInfo, enclosedPlaces }),
    },
    statVarInfo: {
      value: statVarInfo,
      set: (statVarInfo) => setStatVarInfo(statVarInfo),
      setStatVar: (statVar) => setStatVarInfo({ ...statVarInfo, statVar }),
      setStatVarName: (name) => setStatVarInfo({ ...statVarInfo, name }),
      setPerCapita: (perCapita) =>
        setStatVarInfo({ ...statVarInfo, perCapita }),
    },
  };
}
