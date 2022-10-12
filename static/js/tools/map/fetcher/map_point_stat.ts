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
 * Fetch the map point stat data.
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch } from "react";

import {
  EntityObservationWrapper,
  PointApiResponse,
} from "../../../shared/stat_types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { getDate } from "../util";

export function fetchMapPointStat(
  parentEntity: string,
  childType: string,
  statVar: string,
  mapPointSv: string,
  date: string,
  dispatch: Dispatch<ChartStoreAction>
): void {
  const action: ChartStoreAction = {
    type: ChartDataType.mapPointStat,
    error: null,
    context: {
      placeInfo: {
        enclosingPlace: {
          dcid: parentEntity,
          name: "",
        },
        mapPointPlaceType: childType,
      },
      statVar: {
        dcid: statVar,
        date,
        mapPointSv,
      },
    },
  };
  const usedSV = mapPointSv || statVar;
  axios
    .get<PointApiResponse>("/api/observations/point/within", {
      params: {
        child_type: childType,
        date: getDate(usedSV, date),
        parent_entity: parentEntity,
        variables: [usedSV],
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      if (_.isEmpty(resp.data.data[usedSV])) {
        action.error = "error fetching map point stat data";
      } else {
        action.payload = {
          data: resp.data.data[usedSV],
          facets: resp.data.facets,
        } as EntityObservationWrapper;
      }
      dispatch(action);
      console.log("map point stat dispatched");
    })
    .catch(() => {
      action.error = "error fetching map point stat data";
      dispatch(action);
    });
}
