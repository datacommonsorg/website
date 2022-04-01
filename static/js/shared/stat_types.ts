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

/**
 * Stat API related types.
 */

export interface StatMetadata {
  importName?: string;
  provenanceUrl?: string;
  measurementMethod?: string;
  observationPeriod?: string;
  scalingFactor?: string;
  unit?: string;
}

export interface TimeSeries {
  val?: {
    [date: string]: number; // Date might be "latest" if it's from the cache
  };
  metadata?: StatMetadata;
}

// rsponse from /api/stats
export interface StatApiResponse {
  [place: string]: {
    data: {
      [statVar: string]: TimeSeries | null;
    };
    name?: string;
  };
}

// response from /place/displayname
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

// response from /api/stats/all
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

export interface PlacePointStatData {
  date: string;
  value: number;
  metaHash?: number;
  metadata?: StatMetadata;
}
export interface PlacePointStat {
  metaHash?: number;
  stat: Record<string, PlacePointStatData>;
}

export interface PlacePointStatAll {
  statList: PlacePointStat[];
}

// response from /api/stats/within-place and /api/stats/set
export interface GetStatSetResponse {
  data: Record<string, PlacePointStat>;
  metadata: Record<number, StatMetadata>;
}

// response from /api/stats/within-place/all
export interface GetStatSetAllResponse {
  data: Record<string, PlacePointStatAll>;
  metadata: Record<number, StatMetadata>;
}
