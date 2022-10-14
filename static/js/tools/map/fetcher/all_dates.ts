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
 * Fetch all the avaiable date for time slider.
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { GetPlaceStatDateWithinPlaceResponse } from "../../../shared/stat_types";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchAllDates(dispatch: Dispatch<ChartStoreAction>): void {
  const { statVar, placeInfo, display } = useContext(Context);
  useEffect(() => {
    const contextOk =
      display.value.showTimeSlider &&
      placeInfo.value.enclosingPlace.dcid &&
      placeInfo.value.enclosedPlaceType &&
      statVar.value.dcid;
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.ALL_DATES,
      error: null,
      context: {
        statVar: {
          dcid: statVar.value.dcid,
        },
        placeInfo: {
          enclosedPlaceType: placeInfo.value.enclosedPlaceType,
          enclosingPlace: {
            dcid: placeInfo.value.enclosingPlace.dcid,
            name: "",
          },
        },
      },
    };
    axios
      .get("/api/stats/date/within-place", {
        params: {
          ancestorPlace: placeInfo.value.enclosingPlace.dcid,
          childPlaceType: placeInfo.value.enclosedPlaceType,
          statVars: [statVar.value.dcid],
        },
      })
      .then((resp) => {
        if (_.isEmpty(resp.data)) {
          action.error = "error fetching all the dates";
        } else {
          action.payload = resp.data as GetPlaceStatDateWithinPlaceResponse;
        }
        dispatch(action);
        console.log("all dates data dispatched");
      })
      .catch(() => {
        action.error = "error fetching all the dates";
        dispatch(action);
      });
  }, [
    display.value.showTimeSlider,
    placeInfo.value.enclosingPlace.dcid,
    placeInfo.value.enclosedPlaceType,
    statVar.value.dcid,
    dispatch,
  ]);
}
