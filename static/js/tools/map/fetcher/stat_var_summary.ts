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
 * Fetch stat var summary data for time slider.
 */

import axios from "axios";
import _ from "lodash";
import { Dispatch, useContext, useEffect } from "react";

import { StatVarSummary } from "../../../shared/types";
import { stringifyFn } from "../../../utils/axios";
import { ChartDataType, ChartStoreAction } from "../chart_store";
import { Context } from "../context";

export function useFetchStatVarSummary(
  dispatch: Dispatch<ChartStoreAction>
): void {
  const { statVar, display } = useContext(Context);
  useEffect(() => {
    const contextOk = display.value.showTimeSlider && statVar.value.dcid;
    if (!contextOk) {
      return;
    }
    const action: ChartStoreAction = {
      type: ChartDataType.STAT_VAR_SUMMARY,
      error: null,
      context: {
        statVar: {
          dcid: statVar.value.dcid,
        },
      },
    };
    axios
      .get("/api/variable/info", {
        params: {
          dcids: [statVar.value.dcid],
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        if (_.isEmpty(resp.data)) {
          action.error = "error fetching stat var summary data";
        } else {
          action.payload = resp.data[statVar.value.dcid] as StatVarSummary;
        }
        console.log("[Map Fetch] stat var summary");
        dispatch(action);
      })
      .catch(() => {
        action.error = "error fetching stat var summary data";
        dispatch(action);
      });
  }, [statVar.value.dcid, display.value.showTimeSlider, dispatch]);
}
