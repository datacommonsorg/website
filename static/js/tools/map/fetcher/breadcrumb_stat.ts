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
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import {
  EntityObservationWrapper,
  PointApiResponse,
} from "../../../shared/stat_types";
import { getCappedStatVarDate } from "../../../shared/util";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchBreadcrumbStat(
  dispatch: Dispatch<ChartStoreAction>
): void {
  const { dateCtx, placeInfo, statVar } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.selectedPlace.dcid &&
      placeInfo.value.parentPlaces &&
      statVar.value.dcid;
    if (!contextOk) {
      return;
    }
    const placeDcids = placeInfo.value.parentPlaces.map((x) => x.dcid);
    placeDcids.push(placeInfo.value.selectedPlace.dcid);

    const action: ChartStoreAction = {
      type: ChartDataType.BREADCRUMB_STAT,
      context: {
        date: dateCtx.value,
        placeInfo: {
          selectedPlace: {
            dcid: placeInfo.value.selectedPlace.dcid,
            name: "",
            types: null,
          },
        },
        statVar: {
          dcid: statVar.value.dcid,
        },
      },
      error: null,
    };

    const date = getCappedStatVarDate(statVar.value.dcid, dateCtx.value);
    axios
      .get<PointApiResponse>("/api/observations/point", {
        params: {
          date,
          entities: placeDcids,
          variables: [statVar.value.dcid],
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        if (_.isEmpty(resp.data.data[statVar.value.dcid])) {
          action.error = "error fetching breadcrumb stat data";
        } else {
          action.payload = {
            data: resp.data.data[statVar.value.dcid],
            facets: resp.data.facets,
          } as EntityObservationWrapper;
        }
        console.log(`[Map Fetch] breadcrumb stat for date: ${date}`);
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching breadcrumb stat data";
        dispatch(action);
      });
  }, [
    placeInfo.value.selectedPlace.dcid,
    placeInfo.value.parentPlaces,
    statVar.value.dcid,
    dateCtx.value,
    dispatch,
  ]);
}
