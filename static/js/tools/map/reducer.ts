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

import { DataPointMetadata } from "../../shared/types";
import { ChartStore, ChartStoreAction } from "./chart_store";

// A reducer used for merging field in ChartStore object. It adds fetched raw
// data to the ChartStore.
export function chartStoreReducer(
  chartStore: ChartStore,
  action: ChartStoreAction
): ChartStore {
  return {
    ...chartStore,
    [action.type]: {
      data: action.payload,
      context: action.context,
      error: action.error,
    },
  };
}

// A reducer to merge sources from custom hooks.
export function sourcesReducer(
  sources: Set<string>,
  payload: Set<string>
): Set<string> {
  return new Set([...Array.from(sources), ...Array.from(payload)]);
}

// A reducer to merge metadata from custom hooks.
export function metadataReducer(
  metadata: Record<string, DataPointMetadata>,
  payload: Record<string, DataPointMetadata>
): Record<string, DataPointMetadata> {
  return { ...metadata, ...payload };
}
