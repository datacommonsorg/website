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
 * Fetch all facets stat data.
 */

import axios from "axios";
import { Dispatch } from "react";

import {
  EntityObservationListWrapper,
  PointAllApiResponse,
} from "../../../shared/stat_types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { getDate } from "../util";

export function fetchAllStat(
  parentEntity: string,
  childType: string,
  statVar: string,
  date: string,
  dispatch: Dispatch<ChartStoreAction>
): void {
  axios
    .get<PointAllApiResponse>("/api/observations/point/within/all", {
      params: {
        child_type: childType,
        date: getDate(statVar, date),
        parent_entity: parentEntity,
        variables: [statVar],
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      dispatch({
        type: ChartDataType.allStat,
        payload: {
          data: resp.data.data[statVar],
          facets: resp.data.facets,
        } as EntityObservationListWrapper,
        context: {
          placeInfo: {
            enclosingPlace: {
              dcid: parentEntity,
              name: "",
            },
            enclosedPlaceType: childType,
          },
          statVar: {
            dcid: statVar,
            date,
          },
        },
      });
      console.log("all stat dispatched");
    });
}
