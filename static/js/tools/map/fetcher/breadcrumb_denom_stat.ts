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

import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { EntitySeriesWrapper } from "../../../shared/stat_types";
import { getSeries } from "../../../utils/data_fetch_utils";
import { ChartDataType, ChartStore, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchBreadcrumbDenomStat(
  chartStore: ChartStore,
  dispatch: Dispatch<ChartStoreAction>
): void {
  const { placeInfo, statVar } = useContext(Context);
  useEffect(() => {
    const contextOk =
      placeInfo.value.selectedPlace.dcid &&
      placeInfo.value.parentPlaces &&
      statVar.value.denom;
    if (!contextOk) {
      return;
    }
    const placeDcids = placeInfo.value.parentPlaces.map((x) => x.dcid);
    placeDcids.push(placeInfo.value.selectedPlace.dcid);

    const action: ChartStoreAction = {
      type: ChartDataType.BREADCRUMB_DENOM_STAT,
      context: {
        placeInfo: {
          selectedPlace: {
            // entities are the parent places + the enclosing place.
            // so the last element is the enclosing place.
            dcid: placeDcids[placeDcids.length - 1],
            name: "",
            types: null,
          },
        },
        statVar: {
          denom: statVar.value.denom,
        },
      },
      error: null,
    };
    getSeries("", placeDcids, [statVar.value.denom])
      .then((resp) => {
        if (_.isEmpty(resp.data[statVar.value.denom])) {
          action.error = "error fetching breadcrumb denom stat data";
        } else {
          action.payload = {
            data: resp.data[statVar.value.denom],
            facets: resp.facets,
          } as EntitySeriesWrapper;
        }
        console.log("[Map Fetch] breadcrumb denom stat");
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching breadcrumb denom stat data";
        dispatch(action);
      });
  }, [
    placeInfo.value.selectedPlace.dcid,
    placeInfo.value.parentPlaces,
    statVar.value.denom,
    dispatch,
  ]);
}
