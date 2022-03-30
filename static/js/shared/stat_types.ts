/**
 * Copyright 2021 Google LLC
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

import { StatMetadata } from "../tools/shared_util";

/**
 * Stat API related types.
 */

export interface TimeSeries {
  val?: {
    [date: string]: number; // Date might be "latest" if it's from the cache
  };
  metadata?: StatMetadata;
}

export interface StatApiResponse {
  [place: string]: {
    data: {
      [statVar: string]: TimeSeries | null;
    };
    name?: string;
  };
}

export interface DisplayNameApiResponse {
  [placeDcid: string]: string;
}

export interface SourceSeries {
  provenanceDomain: string;
  val: { [key: string]: number };
  importName?: string;
  measurementMethod?: string;
  observationPeriod?: string;
  scalingFactor?: string;
  unit?: string;
  mprop?: string;
}

export interface StatAllApiResponse {
  placeData: {
    [place: string]: {
      statVarData: {
        [statVar: string]: {
          sourceSeries: SourceSeries[];
        };
      };
    };
  };
}
