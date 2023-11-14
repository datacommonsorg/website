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

// Custom hook to compute the BigQuery SQL for the current chart.

import { useCallback, useContext } from "react";

import { StatMetadata } from "../../../shared/stat_types";
import { getNonPcQuery, getPcQuery } from "../bq_query_utils";
import { ChartStore } from "../chart_store";
import { Context } from "../context";
import { useAllStatReady } from "../ready_hooks";
import { getDate } from "../util";

export function useGetSqlQuery(chartStore: ChartStore) {
  const { dateCtx, statVar, placeInfo } = useContext(Context);
  const allStatReady = useAllStatReady(chartStore);
  return useCallback(() => {
    if (!allStatReady()) {
      return "";
    }
    const date = getDate(statVar.value.dcid, dateCtx.value);
    let metadata: StatMetadata = {};
    if (statVar.value.metahash in chartStore.allStat.data.facets) {
      metadata = chartStore.allStat.data.facets[statVar.value.metahash];
    }
    if (statVar.value.perCapita) {
      return getPcQuery(
        statVar.value.dcid,
        statVar.value.denom,
        placeInfo.value.enclosingPlace.dcid,
        placeInfo.value.enclosedPlaceType,
        date,
        metadata
      );
    } else {
      return getNonPcQuery(
        statVar.value.dcid,
        placeInfo.value.enclosingPlace.dcid,
        placeInfo.value.enclosedPlaceType,
        date,
        metadata
      );
    }
  }, [
    dateCtx.value,
    statVar.value,
    placeInfo.value,
    chartStore.allStat.data,
    allStatReady,
  ]);
}
