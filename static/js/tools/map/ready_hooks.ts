/**
 * Copyright 2023 Google LLC
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

import { MAP_TYPE } from "./chart";
import { ChartStore } from "./chart_store";
import { Context } from "./context";
import { shouldShowBorder } from "./util";

export function useGeoJsonReady(chartStore: ChartStore) {
  const { placeInfo } = useContext(Context);

  return useCallback(() => {
    const c = chartStore.geoJson.context;
    // if we should show border, check that border data is ready
    const borderIsReady =
      !shouldShowBorder(placeInfo.value.enclosedPlaceType) ||
      !_.isEmpty(chartStore.borderGeoJson.data);
    return (
      !chartStore.geoJson.error &&
      !_.isEmpty(c) &&
      !_.isEmpty(chartStore.geoJson.data) &&
      !_.isEmpty(chartStore.geoJson.data.features) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      borderIsReady
    );
  }, [
    chartStore.geoJson.context,
    chartStore.geoJson.data,
    chartStore.geoJson.error,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    chartStore.borderGeoJson.data,
  ]);
}

export function useDefaultStatReady(chartStore: ChartStore) {
  const { dateCtx, placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.defaultStat.context;
    return (
      !chartStore.defaultStat.error &&
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      statVar.value.dcid === c.statVar.dcid &&
      dateCtx.value === c.date
    );
  }, [
    chartStore.defaultStat.context,
    chartStore.defaultStat.error,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    dateCtx.value,
  ]);
}

export function useAllStatReady(chartStore: ChartStore) {
  const { dateCtx, placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.allStat.context;
    return (
      !chartStore.allStat.error &&
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      statVar.value.dcid === c.statVar.dcid &&
      dateCtx.value === c.date
    );
  }, [
    chartStore.allStat.context,
    chartStore.allStat.error,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    dateCtx.value,
  ]);
}

export function useDenomStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.denomStat.context;
    return (
      !chartStore.denomStat.error &&
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType === c.placeInfo.enclosedPlaceType &&
      statVar.value.denom === c.statVar.denom
    );
  }, [
    chartStore.denomStat.context,
    chartStore.denomStat.error,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.denom,
  ]);
}

export function useBreadcrumbStatReady(chartStore: ChartStore) {
  const { dateCtx, placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.breadcrumbStat.context;
    return (
      !chartStore.breadcrumbStat.error &&
      !_.isEmpty(c) &&
      placeInfo.value.selectedPlace.dcid === c.placeInfo.selectedPlace.dcid &&
      statVar.value.dcid === c.statVar.dcid &&
      dateCtx.value === c.date
    );
  }, [
    chartStore.breadcrumbStat.context,
    chartStore.breadcrumbStat.error,
    placeInfo.value.selectedPlace.dcid,
    statVar.value.dcid,
    dateCtx.value,
  ]);
}

export function useBreadcrumbDenomStatReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.breadcrumbDenomStat.context;
    return (
      !chartStore.breadcrumbDenomStat.error &&
      !_.isEmpty(c) &&
      placeInfo.value.selectedPlace.dcid === c.placeInfo.selectedPlace.dcid &&
      statVar.value.denom === c.statVar.denom
    );
  }, [
    chartStore.breadcrumbDenomStat.context,
    chartStore.breadcrumbDenomStat.error,
    placeInfo.value.selectedPlace.dcid,
    statVar.value.denom,
  ]);
}

export function useMapPointStatReady(chartStore: ChartStore) {
  const { dateCtx, placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.mapPointStat.context;
    return (
      !chartStore.mapPointStat.error &&
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.mapPointPlaceType === c.placeInfo.mapPointPlaceType &&
      statVar.value.dcid === c.statVar.dcid &&
      statVar.value.mapPointSv === c.statVar.mapPointSv &&
      dateCtx.value === c.date
    );
  }, [
    chartStore.mapPointStat.context,
    chartStore.mapPointStat.error,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.mapPointPlaceType,
    statVar.value.dcid,
    statVar.value.mapPointSv,
    dateCtx.value,
  ]);
}

export function useMapPointCoordinateReady(chartStore: ChartStore) {
  const { placeInfo } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.mapPointCoordinate.context;
    return (
      !chartStore.mapPointCoordinate.error &&
      !_.isEmpty(c) &&
      placeInfo.value.enclosingPlace.dcid === c.placeInfo.enclosingPlace.dcid &&
      placeInfo.value.mapPointPlaceType === c.placeInfo.mapPointPlaceType
    );
  }, [
    chartStore.mapPointCoordinate.context,
    chartStore.mapPointCoordinate.error,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.mapPointPlaceType,
  ]);
}

export function useAllDatesReady(chartStore: ChartStore) {
  const { placeInfo, statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.allDates.context;
    return (
      !chartStore.allDates.error &&
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
    chartStore.allDates.error,
  ]);
}

export function useStatVarSummaryReady(chartStore: ChartStore) {
  const { statVar } = useContext(Context);
  return useCallback(() => {
    const c = chartStore.statVarSummary.context;
    return (
      !chartStore.statVarSummary.error &&
      !_.isEmpty(c) &&
      statVar.value.dcid === c.statVar.dcid
    );
  }, [
    statVar.value.dcid,
    chartStore.statVarSummary.context,
    chartStore.statVarSummary.error,
  ]);
}

export function useMapValuesDatesReady(chartStore: ChartStore) {
  const { dateCtx, statVar, placeInfo } = useContext(Context);
  return useCallback(
    (checkDate: boolean) => {
      const c = chartStore.mapValuesDates.context;
      let ready =
        !_.isEmpty(c) &&
        _.isEqual(statVar.value, c.statVar) &&
        _.isEqual(placeInfo.value, c.placeInfo);
      // If only date changes like in time slider, we consider the data as ready
      // so the <ChartLoader /> component will not be unmount, so the time slider
      // component can be alive.
      if (checkDate) {
        ready &&= dateCtx.value === c.date;
      }
      return ready;
    },
    [
      dateCtx.value,
      statVar.value,
      placeInfo.value,
      chartStore.mapValuesDates.context,
    ]
  );
}

export function useBreadcrumbValuesReady(chartStore: ChartStore) {
  const { dateCtx, statVar, placeInfo } = useContext(Context);
  return useCallback(
    (checkDate: boolean) => {
      const c = chartStore.breadcrumbValues.context;

      let ready =
        !_.isEmpty(c) &&
        _.isEqual(statVar.value, c.statVar) &&
        _.isEqual(placeInfo.value.selectedPlace, c.placeInfo.selectedPlace) &&
        _.isEqual(placeInfo.value.parentPlaces, c.placeInfo.parentPlaces);
      // If only date changes like in time slider, we consider the data as ready
      // so the <ChartLoader /> component will not be unmount, so the time slider
      // component can be alive.
      if (checkDate) {
        ready &&= dateCtx.value === c.date;
      }
      return ready;
    },
    [
      dateCtx.value,
      statVar.value,
      placeInfo.value,
      chartStore.breadcrumbValues.context,
    ]
  );
}

// Check if data is ready to render.
export function useRenderReady(chartStore: ChartStore) {
  const { display, statVar } = useContext(Context);
  const breadcrumbValueReady = useBreadcrumbValuesReady(chartStore);
  const mapValuesDatesReady = useMapValuesDatesReady(chartStore);
  const geoJsonReady = useGeoJsonReady(chartStore);
  return useCallback(
    (mapType: MAP_TYPE) => {
      return (
        statVar.value.info &&
        (geoJsonReady() || mapType === MAP_TYPE.LEAFLET) &&
        breadcrumbValueReady(!display.value.showTimeSlider) &&
        mapValuesDatesReady(!display.value.showTimeSlider)
      );
    },
    [
      display.value.showTimeSlider,
      statVar.value.info,
      geoJsonReady,
      breadcrumbValueReady,
      mapValuesDatesReady,
    ]
  );
}
