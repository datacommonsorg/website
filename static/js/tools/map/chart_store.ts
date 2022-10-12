/**
 * Copyright 2022 Google LLC
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

import _ from "lodash";

import { GeoJsonData, MapPoint } from "../../chart/types";
import {
  EntityObservationListWrapper,
  EntityObservationWrapper,
  EntitySeriesWrapper,
} from "../../shared/stat_types";
import { DataContext, PlaceInfo, StatVar } from "./context";

export enum ChartDataType {
  geoJson,
  defaultStat,
  allStat,
  denomStat,
  breadcrumbStat,
  breadcrumbDenomStat,
  mapPointStat,
  mapPointCoordinate,
}

export interface ChartStoreData {
  geoJson?: GeoJsonData;
  defaultStat?: EntityObservationWrapper;
  allStat?: EntityObservationListWrapper;
  denomStat?: EntitySeriesWrapper;
  breadcrumbStat?: EntityObservationWrapper;
  breadcrumbDenomStat?: EntitySeriesWrapper;
  mapPointStat?: EntityObservationWrapper;
  mapPointCoordinates?: Array<MapPoint>;
}

export interface ChartStoreContext {
  geoJson?: DataContext;
  defaultStat?: DataContext;
  allStat?: DataContext;
  denomStat?: DataContext;
  breadcrumbStat?: DataContext;
  breadcrumbDenomStat?: DataContext;
  mapPointStat?: DataContext;
  mapPointCoordinate?: DataContext;
}

// ChartStore holds the raw data and corresponding context.
// When context changes, the data fetch is async and could take long time. The
// context here is used to check if the data context matches the actual context.
export interface ChartStore {
  data?: ChartStoreData;
  context?: ChartStoreContext;
}

/**
 * Check whether data is ready to use.
 *
 * Data is ready if the context in ChartStore matches the current context.
 *
 * @param c The data context from chart store.
 * @param type The type of the data.
 * @param placeInfo The current placeInfo from the context.
 * @param statVar The current statVar from the context.
 * @returns
 */
export const isDataReady = (
  c: DataContext,
  type: ChartDataType,
  placeInfo: PlaceInfo,
  statVar: StatVar
): boolean => {
  if (_.isEmpty(c)) {
    return false;
  }
  switch (type) {
    case ChartDataType.geoJson:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        placeInfo.enclosedPlaceType === c.placeInfo.enclosedPlaceType
      );
    case ChartDataType.defaultStat:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        placeInfo.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
        statVar.dcid === c.statVar.dcid &&
        statVar.date === c.statVar.date
      );
    case ChartDataType.allStat:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        placeInfo.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
        statVar.dcid === c.statVar.dcid &&
        statVar.date === c.statVar.date
      );
    case ChartDataType.denomStat:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        placeInfo.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
        statVar.denom === c.statVar.denom
      );
    case ChartDataType.breadcrumbStat:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        statVar.dcid === c.statVar.dcid &&
        statVar.date === c.statVar.date
      );
    case ChartDataType.breadcrumbDenomStat:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        statVar.denom === c.statVar.denom
      );
    case ChartDataType.mapPointStat:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        statVar.dcid === c.statVar.dcid &&
        statVar.dcid === c.statVar.dcid &&
        statVar.date === c.statVar.date
      );
    case ChartDataType.mapPointCoordinate:
      return (
        placeInfo.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
        placeInfo.mapPointPlaceType === c.placeInfo.mapPointPlaceType
      );
  }
};

export interface ChartStoreAction {
  type: ChartDataType;
  payload?: any;
  context?: DataContext;
  error?: string;
}

// A reducer used by a useReducer() hook. It adds a type of data to the
// ChartStore.
export function chartStoreReducer(
  chartStore: ChartStore,
  action: ChartStoreAction
): ChartStore {
  const field = ChartDataType[action.type];
  const newStore = _.cloneDeep(chartStore);
  newStore.data[field] = action.payload;
  if (action.context) {
    newStore.context[field] = action.context;
  }
  return newStore;
}
