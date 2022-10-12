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
 * Fetch the breadcrumb (parent places) denominator stat data
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch } from "react";

import {
  EntitySeriesWrapper,
  SeriesApiResponse,
} from "../../../shared/stat_types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";

export function fetchBreadcrumbDenomStat(
  entities: string[],
  statVar: string,
  dispatch: Dispatch<ChartStoreAction>
): void {
  const action: ChartStoreAction = {
    type: ChartDataType.breadcrumbDenomStat,
    context: {
      placeInfo: {
        enclosingPlace: {
          // entities are the parent places + the enclosing place.
          // so the last element is the enclosing place.
          dcid: entities[entities.length - 1],
          name: "",
        },
      },
      statVar: {
        denom: statVar,
      },
    },
    error: null,
  };
  axios
    .get<SeriesApiResponse>("/api/observations/series", {
      params: {
        entities: entities,
        variables: [statVar],
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      if (_.isEmpty(resp.data.data[statVar])) {
        action.error = "error fetching breadcrumb denom stat data";
      } else {
        action.payload = {
          data: resp.data.data[statVar],
          facets: resp.data.facets,
        } as EntitySeriesWrapper;
      }
      dispatch(action);
      console.log("breadcrumb denom stat action dispatched");
    })
    .catch(() => {
      action.error = "error fetching breadcrumb denom stat data";
      dispatch(action);
    });
}
