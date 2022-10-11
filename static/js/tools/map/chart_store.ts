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
  mapPointCoordinates,
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

export interface ChartStore {
  data?: ChartStoreData;
  context?: ChartStoreContext;
}

export const geoJsonReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo
) => {
  const c = context.geoJson;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    placeInfo.enclosedPlaceType == c.placeInfo.enclosedPlaceType
  );
};

export const defaultStatReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo,
  statVar: StatVar
) => {
  const c = context.defaultStat;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    placeInfo.enclosedPlaceType == c.placeInfo.enclosedPlaceType &&
    statVar.dcid == c.statVar.dcid &&
    statVar.date == c.statVar.date
  );
};

export const allStatReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo,
  statVar: StatVar
) => {
  const c = context.allStat;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    placeInfo.enclosedPlaceType == c.placeInfo.enclosedPlaceType &&
    statVar.dcid == c.statVar.dcid &&
    statVar.date == c.statVar.date
  );
};

export const denomStatReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo,
  statVar: StatVar
) => {
  const c = context.denomStat;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    placeInfo.enclosedPlaceType == c.placeInfo.enclosedPlaceType &&
    statVar.denom == c.statVar.denom
  );
};

export const breadcrumbStatReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo,
  statVar: StatVar
) => {
  const c = context.breadcrumbStat;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    statVar.dcid == c.statVar.dcid &&
    statVar.date == c.statVar.date
  );
};

export const breadcrumbDenomStatReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo,
  statVar: StatVar
) => {
  const c = context.breadcrumbDenomStat;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    statVar.denom == c.statVar.denom
  );
};

export const mapPointStatReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo,
  statVar: StatVar
) => {
  const c = context.mapPointStat;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    statVar.dcid == c.statVar.dcid &&
    statVar.dcid == c.statVar.dcid &&
    statVar.date == c.statVar.date
  );
};

export const mapPointCoordinateReady = (
  context: ChartStoreContext,
  placeInfo: PlaceInfo
) => {
  const c = context.mapPointCoordinate;
  return (
    !_.isEmpty(c) &&
    placeInfo.enclosingPlace.dcid == c.placeInfo.enclosingPlace.dcid &&
    placeInfo.mapPointPlaceType == c.placeInfo.mapPointPlaceType
  );
};

export interface ChartStoreAction {
  type: ChartDataType;
  payload: any;
  context?: DataContext;
}

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
