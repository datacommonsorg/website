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
 * Fetch the map point geo coordinates.
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { MapPoint } from "../../../chart/types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchMapPointCoordinate(
  dispatch: Dispatch<ChartStoreAction>
): void {
  const { placeInfo } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.enclosingPlace.dcid && placeInfo.value.mapPointPlaceType;
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.MAP_POINT_COORDINATE,
      error: null,
      context: {
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
          },
          mapPointPlaceType: placeInfo.value.mapPointPlaceType,
        },
      },
    };
    axios
      .get<Array<MapPoint>>("/api/choropleth/map-points", {
        params: {
          placeDcid: placeInfo.value.enclosingPlace.dcid,
          placeType: placeInfo.value.mapPointPlaceType,
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        if (resp.status !== 200) {
          action.error = "error fetching map point coordinate data";
        } else {
          action.payload = resp.data as Array<MapPoint>;
        }
        console.log("[Map Fetch] map point coordinate");
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching map point coordinate data";
        dispatch(action);
      });
  }, [
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.mapPointPlaceType,
    dispatch,
  ]);
}
