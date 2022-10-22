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
 * Fetch Geo Raster data.
 */

import geoblaze from "geoblaze";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchGeoRaster(dispatch: Dispatch<ChartStoreAction>): void {
  const { dateCtx, placeInfo, statVar, display } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType &&
      statVar.value.dcid &&
      display.value.allowLeaflet;
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.GEO_RASTER,
      error: null,
      context: {
        date: dateCtx.value,
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
          },
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
        },
        statVar: {
          dcid: statVar.value.dcid,
        },
      },
    };
    // TODO: update the url with correct arguments once flask endpoint has been
    // updated to take params
    geoblaze
      .load("/api/choropleth/geotiff")
      .then((geoRaster) => {
        if (_.isEmpty(geoRaster)) {
          action.error = "error fetching geo raster data";
        } else {
          action.payload = geoRaster;
        }
        dispatch(action);
        console.log("[Map Fetch] georaster");
      })
      .catch(() => {
        action.error = "error fetching geo raster data";
        dispatch(action);
      });
  }, [
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    dateCtx.value,
    display.value.allowLeaflet,
    dispatch,
  ]);
}
