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

import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { EntityObservationWrapper } from "../../../shared/stat_types";
import { getCappedStatVarDate } from "../../../shared/util";
import { getPointWithin } from "../../../utils/data_fetch_utils";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchMapPointStat(
  dispatch: Dispatch<ChartStoreAction>
): void {
  const { dateCtx, placeInfo, statVar } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.mapPointPlaceType &&
      placeInfo.value.enclosingPlace.dcid &&
      (statVar.value.dcid || statVar.value.mapPointSv);
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.MAP_POINT_STAT,
      error: null,
      context: {
        date: dateCtx.value,
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
          },
          mapPointPlaceType: placeInfo.value.mapPointPlaceType,
        },
        statVar: {
          dcid: statVar.value.dcid,
          mapPointSv: statVar.value.mapPointSv,
        },
      },
    };
    const usedSV = statVar.value.mapPointSv || statVar.value.dcid;
    const date = getCappedStatVarDate(usedSV, dateCtx.value);
    getPointWithin(
      "",
      placeInfo.value.mapPointPlaceType,
      placeInfo.value.enclosingPlace.dcid,
      [usedSV],
      date
    )
      .then((resp) => {
        if (_.isEmpty(resp.data[usedSV])) {
          action.error = "error fetching map point stat data";
        } else {
          action.payload = {
            data: resp.data[usedSV],
            facets: resp.facets,
          } as EntityObservationWrapper;
        }
        console.log(`[Map Fetch] map point stat for: ${date}`);
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching map point stat data";
        dispatch(action);
      });
  }, [
    dateCtx.value,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.mapPointPlaceType,
    statVar.value.dcid,
    statVar.value.mapPointSv,
    dispatch,
  ]);
}
