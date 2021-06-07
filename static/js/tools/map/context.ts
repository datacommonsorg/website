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

interface Setter<T> {
  (value: T): void;
}

interface StatVarInfo {
  statVar: StatsVarNode;
  name: string;
  perCapita: boolean;
}

interface StatVarInfoWrapper {
  value: StatVarInfo;

  set: Setter<StatVarInfo>;
  setStatVar: Setter<StatsVarNode>;
  setStatVarName: Setter<string>;
  setPerCapita: Setter<boolean>;
}

interface PlaceInfo {
  enclosingPlace: NamedPlace;
  enclosedPlaceType: string;
  enclosedPlaces: Array<string>;
}

interface PlaceInfoWrapper {
  value: PlaceInfo;

  set: Setter<PlaceInfo>;
  setEnclosingPlace: Setter<NamedPlace>;
  setEnclosedPlaceType: Setter<string>;
  setEnclosedPlaces: Setter<Array<string>>;
}

interface IsLoading {
  isDataLoading: boolean;
  isPlaceInfoLoading: boolean;
}

interface IsLoadingWrapper {
  value: IsLoading;

  set: Setter<IsLoading>;
  setIsDataLoading: Setter<boolean>;
  setIsPlaceInfoLoading: Setter<boolean>;
}

interface ContextType {
  statVarInfo: StatVarInfoWrapper;
  placeInfo: PlaceInfoWrapper;
  isLoading: IsLoadingWrapper;
}

const Context = createContext({} as ContextType);

function getInitialContext(params: URLSearchParams): ContextType {
  const [statVarInfo, setStatVarInfo] = useState(applyHashStatVarInfo(params));
  const [placeInfo, setPlaceInfo] = useState(applyHashPlaceInfo(params));
  const [isLoading, setIsLoading] = useState({
    isDataLoading: false,
    isPlaceInfoLoading: false,
  });
  return {
    statVarInfo: {
      value: statVarInfo,
      set: (statVarInfo) => setStatVarInfo(statVarInfo),
      setStatVar: (statVar) => setStatVarInfo({ ...statVarInfo, statVar }),
      setStatVarName: (name) => setStatVarInfo({ ...statVarInfo, name }),
      setPerCapita: (perCapita) =>
        setStatVarInfo({ ...statVarInfo, perCapita }),
    },
    placeInfo: {
      value: placeInfo,
      set: (placeInfo) => setPlaceInfo(placeInfo),
      setEnclosingPlace: (enclosingPlace) =>
        setPlaceInfo({
          ...placeInfo,
          enclosingPlace,
          enclosedPlaceType: "",
          enclosedPlaces: [],
        }),
      setEnclosedPlaceType: (enclosedPlaceType) =>
        setPlaceInfo({ ...placeInfo, enclosedPlaceType, enclosedPlaces: [] }),
      setEnclosedPlaces: (enclosedPlaces) =>
        setPlaceInfo({ ...placeInfo, enclosedPlaces }),
    },
    isLoading: {
      value: isLoading,
      set: (isLoading) => setIsLoading(isLoading),
      setIsDataLoading: (isDataLoading) =>
        setIsLoading({ ...isLoading, isDataLoading }),
      setIsPlaceInfoLoading: (isPlaceInfoLoading) =>
        setIsLoading({ ...isLoading, isPlaceInfoLoading }),
    },
  };
}

export {
  Context,
  getInitialContext,
  ContextType,
  StatVarInfo,
  StatVarInfoWrapper,
  PlaceInfo,
  PlaceInfoWrapper,
  IsLoading,
  IsLoadingWrapper,
};
