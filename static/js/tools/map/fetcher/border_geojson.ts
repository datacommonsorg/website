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
 * Fetch Geo Json data for the border of the containing place.
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { GeoJsonData } from "../../../chart/types";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

const BORDER_GEOJSON_PROPERTY = "geoJsonCoordinates";

export function useFetchBorderGeoJson(
  dispatch: Dispatch<ChartStoreAction>
): void {
  const { placeInfo } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.enclosingPlace && placeInfo.value.enclosingPlace.dcid;
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.BORDER_GEO_JSON,
      error: null,
      context: {
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
          },
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
        },
      },
    };
    axios
      .post("/api/choropleth/node-geojson", {
          nodes: [placeInfo.value.enclosingPlace.dcid],
          geoJsonProp: BORDER_GEOJSON_PROPERTY,
      })
      .then((resp) => {
        if (_.isEmpty(resp.data)) {
          action.error = "error fetching border geo json data";
        } else {
          action.payload = resp.data as GeoJsonData;
        }
        console.log("[Map Fetch] border geojson");
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching border geo json data";
        dispatch(action);
      });
  }, [
    placeInfo.value.enclosingPlace,
    placeInfo.value.enclosedPlaceType,
    dispatch,
  ]);
}
