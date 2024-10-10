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

import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { EntityObservationWrapper } from "../../../shared/stat_types";
import { getCappedStatVarDate } from "../../../shared/util";
import { getPointWithin } from "../../../utils/data_fetch_utils";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

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
          },
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
        },
        statVar: {
          dcid: statVar.value.dcid,
        },
      },
    };
    const date = getCappedStatVarDate(statVar.value.dcid, dateCtx.value);
    getPointWithin(
      "",
      placeInfo.value.enclosedPlaceType,
      placeInfo.value.enclosingPlace.dcid,
      [statVar.value.dcid],
      date
    )
      .then((resp) => {
        if (_.isEmpty(resp.data[statVar.value.dcid])) {
          action.error = "error fetching default stat data";
        } else {
          action.payload = {
            data: resp.data[statVar.value.dcid],
            facets: resp.facets,
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
