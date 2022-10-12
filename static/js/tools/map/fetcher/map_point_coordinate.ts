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
import { Dispatch } from "react";

import { MapPoint } from "../../../chart/types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";

export function fetchMapPointCoordinate(
  parentEntity: string,
  placeType: string,
  dispatch: Dispatch<ChartStoreAction>
): void {
  const action: ChartStoreAction = {
    type: ChartDataType.MAP_POINT_COORDINATE,
    error: null,
    context: {
      placeInfo: {
        enclosingPlace: {
          dcid: parentEntity,
          name: "",
        },
        mapPointPlaceType: placeType,
      },
    },
  };
  axios
    .get<Array<MapPoint>>("/api/choropleth/map-points", {
      params: {
        placeDcid: parentEntity,
        placeType: placeType,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      if (_.isEmpty(resp.data)) {
        action.error = "error fetching map point coordinate data";
      } else {
        action.payload = resp.data as Array<MapPoint>;
      }
      dispatch(action);
      console.log("map point coordinate dispatched");
    })
    .catch(() => {
      action.error = "error fetching map point coordinate data";
      dispatch(action);
    });
}
