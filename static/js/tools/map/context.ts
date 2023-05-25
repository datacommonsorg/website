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
import { NamedPlace, NamedTypedPlace } from "../../shared/types";
import { Setter } from "../../shared/util";
import {
  applyHashDate,
  applyHashDisplay,
  applyHashPlaceInfo,
  applyHashStatVar,
  getMapPointPlaceType,
} from "./util";

/**
 * Global app context for map explorer tool.
 */

export interface DateWrapper {
  value: string;
  set: Setter<string>;
}

// Information relating to the stat var to plot
export interface StatVar {
  // additional information about stat vars. key is stat var dcid.
  info?: Record<string, StatVarInfo>;
  // dcid of the chosen stat var
  dcid?: string;
  // Whether to plot per capita values
  perCapita?: boolean;
  // dcid of the stat var to use to calculate per capita
  denom?: string;
  // dcid of the stat var to use for map points
  mapPointSv?: string;
  // metahash of the source to get data from
  metahash?: string;
}

// Wraps StatVarInfo with its setters
export interface StatVarWrapper {
  value: StatVar;

  set: Setter<StatVar>;
  setInfo: Setter<Record<string, StatVarInfo>>;
  setDcid: Setter<string>;
  setPerCapita: Setter<boolean>;
  setDenom: Setter<string>;
  setMapPointSv: Setter<string>;
  setMetahash: Setter<string>;
}

// Information relating to the places to plot
export interface PlaceInfo {
  // The current place that has been selected
  selectedPlace?: NamedTypedPlace;
  // The parent places of the selected place
  parentPlaces?: Array<NamedTypedPlace>;
  // Place that encloses the places to plot
  enclosingPlace?: NamedTypedPlace;
  // The type of place to plot
  enclosedPlaceType?: string;
  // The type of place to show points on the map for
  mapPointPlaceType?: string;
}

// Wraps PlaceInfo with its setters
export interface PlaceInfoWrapper {
  value: PlaceInfo;

  set: Setter<PlaceInfo>;
  setSelectedPlace: Setter<NamedTypedPlace>;
  setParentPlaces: Setter<Array<NamedTypedPlace>>;
  setEnclosingPlace: Setter<NamedTypedPlace>;
  setEnclosedPlaceType: Setter<string>;
  setMapPointPlaceType: Setter<string>;
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
  // whether we want to show map points on the chart
  showMapPoints: boolean;
  // TEMPORARY: whether to show the time slider
  showTimeSlider: boolean;
  // TEMPORARY: whether to allow leaflet map
  allowLeaflet: boolean;
}

export interface DisplayOptionsWrapper {
  value: DisplayOptions;

  set: Setter<DisplayOptions>;
  setShowMapPoints: Setter<boolean>;
  setShowTimeSlider: Setter<boolean>;
  setDomain: Setter<[number, number, number]>;
}

export interface DataContext {
  date?: string;
  statVar?: StatVar;
  placeInfo?: PlaceInfo;
}

export interface ContextType {
  // date of the stat var data to get
  dateCtx: DateWrapper;
  statVar: StatVarWrapper;
  placeInfo: PlaceInfoWrapper;
  isLoading: IsLoadingWrapper;
  display: DisplayOptionsWrapper;
}

export const Context = createContext({} as ContextType);

export function useInitialContext(params: URLSearchParams): ContextType {
  const [date, setDate] = useState(applyHashDate(params));
  const [statVar, setStatVar] = useState(applyHashStatVar(params));
  const [placeInfo, setPlaceInfo] = useState(applyHashPlaceInfo(params));
  const [isLoading, setIsLoading] = useState({
    isDataLoading: false,
    isPlaceInfoLoading: false,
  });
  const [display, setDisplay] = useState(applyHashDisplay(params));
  // If map points place type was set in the url, use that type. Otherwise,
  // infer map points place type based on stat var
  const mapPointPlaceType = placeInfo.mapPointPlaceType
    ? placeInfo.mapPointPlaceType
    : getMapPointPlaceType(statVar.dcid);
  return {
    dateCtx: {
      value: date,
      set: (date) => setDate(date),
    },
    isLoading: {
      value: isLoading,
      set: (isLoading) => setIsLoading(isLoading),
      setIsDataLoading: (isDataLoading) =>
        setIsLoading({ ...isLoading, isDataLoading }),
      setIsPlaceInfoLoading: (isPlaceInfoLoading) =>
        setIsLoading({ ...isLoading, isPlaceInfoLoading }),
    },
    placeInfo: {
      value: { ...placeInfo, mapPointPlaceType },
      set: (placeInfo) => setPlaceInfo(placeInfo),
      setSelectedPlace: (selectedPlace) =>
        setPlaceInfo({
          ...placeInfo,
          selectedPlace,
          enclosedPlaceType: "",
          parentPlaces: null,
          enclosingPlace: { dcid: "", name: "", types: null },
        }),
      setEnclosingPlace: (enclosingPlace) =>
        setPlaceInfo({
          ...placeInfo,
          enclosingPlace,
        }),
      setEnclosedPlaceType: (enclosedPlaceType) =>
        setPlaceInfo({
          ...placeInfo,
          enclosingPlace: { dcid: "", name: "", types: null },
          enclosedPlaceType,
        }),
      setParentPlaces: (parentPlaces) =>
        setPlaceInfo({ ...placeInfo, parentPlaces }),
      setMapPointPlaceType: (mapPointPlaceType) =>
        setPlaceInfo({ ...placeInfo, mapPointPlaceType }),
    },
    statVar: {
      value: statVar,
      set: (statVar) => setStatVar(statVar),
      setDcid: (dcid) => setStatVar({ ...statVar, dcid, info: null }),
      setInfo: (info) => setStatVar({ ...statVar, info }),
      setPerCapita: (perCapita) => setStatVar({ ...statVar, perCapita }),
      setDenom: (denom) => setStatVar({ ...statVar, denom }),
      setMapPointSv: (sv) => setStatVar({ ...statVar, mapPointSv: sv }),
      setMetahash: (metahash) => setStatVar({ ...statVar, metahash }),
    },
    display: {
      value: display,
      set: (display) => setDisplay(display),
      setShowMapPoints: (showMapPoints) =>
        setDisplay({ ...display, showMapPoints }),
      setShowTimeSlider: (showTimeSlider) =>
        setDisplay({ ...display, showTimeSlider }),
      setDomain: (domain) => setDisplay({ ...display, domain }),
    },
  };
}
