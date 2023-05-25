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
 * Fetch Geo Json data.
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { GeoJsonData } from "../../../chart/types";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchGeoJson(dispatch: Dispatch<ChartStoreAction>): void {
  const { placeInfo } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.enclosingPlace.dcid && placeInfo.value.enclosedPlaceType;
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.GEO_JSON,
      error: null,
      context: {
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
            types: null,
          },
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
        },
      },
    };
    axios
      .get("/api/choropleth/geojson", {
        params: {
          placeDcid: placeInfo.value.enclosingPlace.dcid,
          placeType: placeInfo.value.enclosedPlaceType,
        },
      })
      .then((resp) => {
        if (_.isEmpty(resp.data)) {
          action.error = "error fetching geo json data";
        } else {
          action.payload = resp.data as GeoJsonData;
        }
        console.log("[Map Fetch] geojson");
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching geo json data";
        dispatch(action);
      });
  }, [
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    dispatch,
  ]);
}
