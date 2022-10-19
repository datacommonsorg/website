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

// This module contains custom React hooks that makes computation for map chart.

import { useMemo } from "react";

import { ChartStore } from "../chart_store";
import { useAllDatesReady } from "../ready_hooks";
import { getTimeSliderDates, SampleDates } from "../util";

export function useComputeSampleDates(chartStore: ChartStore): SampleDates {
  const allDatesReady = useAllDatesReady(chartStore);
  return useMemo(() => {
    if (!allDatesReady()) {
      return null;
    }
    const allSampleDates = getTimeSliderDates(chartStore.allDates.data.data);
    return allSampleDates;
  }, [chartStore.allDates.data, allDatesReady]);
}
