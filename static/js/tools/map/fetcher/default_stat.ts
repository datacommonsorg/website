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
 * Fetch the default (best available) stat data
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import {
  EntityObservationWrapper,
  PointApiResponse,
} from "../../../shared/stat_types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";
import { getDate } from "../util";

export function useFetchDefaultStat(
  dispatch: Dispatch<ChartStoreAction>
): void {
  const { dateCtx, placeInfo, statVar } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType &&
      statVar.value.dcid;
    if (!contextOk) {
      return;
    }

    const action: ChartStoreAction = {
      type: ChartDataType.DEFAULT_STAT,
      error: null,
      context: {
        date: dateCtx.value,
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
            types: null,
          },
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
        },
        statVar: {
          dcid: statVar.value.dcid,
        },
      },
    };
    const date = getDate(statVar.value.dcid, dateCtx.value);
    axios
      .get<PointApiResponse>("/api/observations/point/within", {
        params: {
          childType: placeInfo.value.enclosedPlaceType,
          date,
          parentEntity: placeInfo.value.enclosingPlace.dcid,
          variables: [statVar.value.dcid],
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        if (_.isEmpty(resp.data.data[statVar.value.dcid])) {
          action.error = "error fetching default stat data";
        } else {
          action.payload = {
            data: resp.data.data[statVar.value.dcid],
            facets: resp.data.facets,
          } as EntityObservationWrapper;
        }
        console.log(`[Map Fetch] default stat for date: ${date}`);
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching default stat data";
        dispatch(action);
      });
  }, [
    dateCtx.value,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    dispatch,
  ]);
}
