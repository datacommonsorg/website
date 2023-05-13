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

// TODO(shifucun): remove all the console.log() debugging.

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import {
  EntityObservationListWrapper,
  PointAllApiResponse,
} from "../../../shared/stat_types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";
import { getDate } from "../util";

export function useFetchAllStat(dispatch: Dispatch<ChartStoreAction>): void {
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
      type: ChartDataType.ALL_STAT,
      context: {
        date: dateCtx.value,
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
          },
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
        },
        statVar: {
          dcid: statVar.value.dcid,
        },
      },
      error: null,
    };
    const date = getDate(statVar.value.dcid, dateCtx.value);
    axios
      .get<PointAllApiResponse>("/api/observations/point/within/all", {
        params: {
          childType: placeInfo.value.enclosedPlaceType,
          date: date,
          parentEntity: placeInfo.value.enclosingPlace.dcid,
          variables: [statVar.value.dcid],
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        if (_.isEmpty(resp.data.data[statVar.value.dcid])) {
          action.error = "error fetching all stat data";
        } else {
          action.payload = {
            data: resp.data.data[statVar.value.dcid],
            facets: resp.data.facets,
          } as EntityObservationListWrapper;
        }
        console.log(`[Map Fetch] all stat for date: ${date}`);
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching all stat data";
        dispatch(action);
      });
  }, [
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    dateCtx.value,
    dispatch,
  ]);
}
