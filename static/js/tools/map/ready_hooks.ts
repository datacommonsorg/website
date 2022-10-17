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

/**
 * Contains custom hooks to check if certain chart data is ready to use.
 */

import _ from "lodash";
import { useCallback, useContext } from "react";

import { ChartStore } from "./chart_store";
import { Context } from "./context";

export function useGeoJsonReady(chartStore: ChartStore) {
  const { placeInfo } = useContext(Context);

  return useCallback(() => {
    const c = chartStore.geoJson.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType
    );
  }, [
    chartStore.geoJson.context,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
  ]);
}

export function useDefaultStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.defaultStat.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      statVar.value.dcid === c.statVar.dcid &&
      statVar.value.date === c.statVar.date
    );
  }, [
    chartStore.defaultStat.context,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    statVar.value.date,
  ]);
}

export function useAllStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.allStat.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      statVar.value.dcid === c.statVar.dcid &&
      statVar.value.date === c.statVar.date
    );
  }, [
    chartStore.allStat.context,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    statVar.value.date,
  ]);
}

export function useDenomStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.denomStat.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      statVar.value.denom === c.statVar.denom
    );
  }, [
    chartStore.denomStat.context,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.denom,
  ]);
}

export function useBreadcrumbStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.breadcrumbStat.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      statVar.value.dcid === c.statVar.dcid &&
      statVar.value.date === c.statVar.date
    );
  }, [
    chartStore.breadcrumbStat.context,
    placeInfo.value.enclosingPlace.dcid,
    statVar.value.dcid,
    statVar.value.date,
  ]);
}

export function useBreadcrumbDenomStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.breadcrumbDenomStat.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      statVar.value.denom === c.statVar.denom
    );
  }, [
    chartStore.breadcrumbDenomStat.context,
    placeInfo.value.enclosingPlace.dcid,
    statVar.value.denom,
  ]);
}

export function useMapPointStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.mapPointStat.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.mapPointPlaceType === c.placeInfo.mapPointPlaceType &&
      statVar.value.dcid === c.statVar.dcid &&
      statVar.value.mapPointSv === c.statVar.mapPointSv &&
      statVar.value.date === c.statVar.date
    );
  }, [
    chartStore.mapPointStat.context,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.mapPointPlaceType,
    statVar.value.dcid,
    statVar.value.mapPointSv,
    statVar.value.date,
  ]);
}

export function useMapPointCoordinateReady(chartStore: ChartStore) {
  const { placeInfo } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.mapPointCoordinate.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.mapPointPlaceType === c.placeInfo.mapPointPlaceType
    );
  }, [
    chartStore.mapPointCoordinate.context,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.mapPointPlaceType,
  ]);
}

export function useAllDatesReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.allDates.context;
    return (
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      statVar.value.dcid === c.statVar.dcid
    );
  }, [
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    chartStore.allDates.context,
  ]);
}
