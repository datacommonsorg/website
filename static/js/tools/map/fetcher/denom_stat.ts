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
 * Fetch the stat data for denominator stat var
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import {
  EntitySeriesWrapper,
  SeriesApiResponse,
} from "../../../shared/stat_types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchDenomStat(dispatch: Dispatch<ChartStoreAction>): void {
  const { placeInfo, statVar } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType &&
      statVar.value.denom;
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.DENOM_STAT,
      error: null,
      context: {
        placeInfo: {
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
          },
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
        },
        statVar: {
          denom: statVar.value.denom,
        },
      },
    };
    axios
      .get<SeriesApiResponse>("/api/observations/series/within", {
        params: {
          childType: placeInfo.value.enclosedPlaceType,
          parentEntity: placeInfo.value.enclosingPlace.dcid,
          variables: [statVar.value.denom],
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        if (_.isEmpty(resp.data.data[statVar.value.denom])) {
          action.error = "error fetching denom stat data";
        } else {
          action.payload = {
            data: resp.data.data[statVar.value.denom],
            facets: resp.data.facets,
          } as EntitySeriesWrapper;
        }
        console.log("[Map Fetch] denom stat");
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching denom stat data";
        dispatch(action);
      });
  }, [
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.denom,
    dispatch,
  ]);
}
