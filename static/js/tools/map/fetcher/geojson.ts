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
import { Dispatch } from "react";

import { GeoJsonData } from "../../../chart/types";
import { ChartDataType, ChartStoreAction } from "../chart_store";

export function fetchGeoJson(
  parentPlace: string,
  childType: string,
  dispatch: Dispatch<ChartStoreAction>
): void {
  const action: ChartStoreAction = {
    type: ChartDataType.GEO_JSON,
    error: null,
    context: {
      placeInfo: {
        enclosingPlace: {
          dcid: parentPlace,
          name: "",
        },
        enclosedPlaceType: childType,
      },
    },
  };
  axios
    .get(
      `/api/choropleth/geojson?placeDcid=${parentPlace}&placeType=${childType}`
    )
    .then((resp) => {
      if (_.isEmpty(resp.data)) {
        action.error = "error fetching geo json data";
      } else {
        action.payload = resp.data as GeoJsonData;
      }
      dispatch(action);
      console.log("geojson dispatched");
    })
    .catch(() => {
      action.error = "error fetching geo json data";
      dispatch(action);
    });
}
