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
 * Fetch the breadcrumb (parent places) stat data
 */

import axios from "axios";
import { Dispatch } from "react";

import {
  EntityObservationWrapper,
  PointApiResponse,
} from "../../../shared/stat_types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { getDate } from "../util";

export function fetchBreadcrumbStat(
  entities: string[],
  statVar: string,
  date: string,
  dispatch: Dispatch<ChartStoreAction>
): void {
  axios
    .get<PointApiResponse>("/api/observations/point", {
      params: {
        date: getDate(statVar, date),
        entities: entities,
        variables: [statVar],
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      dispatch({
        type: ChartDataType.breadcrumbStat,
        payload: {
          data: resp.data.data[statVar],
          facets: resp.data.facets,
        } as EntityObservationWrapper,
        context: {
          placeInfo: {
            enclosingPlace: {
              dcid: entities[entities.length - 1],
              name: "",
            },
          },
          statVar: {
            dcid: statVar,
            date: date,
          },
        },
      });
      console.log("breadcrumb stat dispatched");
    });
}
