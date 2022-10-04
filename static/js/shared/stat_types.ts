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

export interface Observation {
  date: string;
  value: number;
  facet?: string;
}

export interface Series {
  series?: Observation[];
  facet?: string;
}

export interface SeriesApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: {
      [entity: string]: Series;
    };
  };
}

export interface SeriesAllApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: {
      [entity: string]: Series[];
    };
  };
}

export interface PointApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: {
      [entity: string]: Observation;
    };
  };
}

export interface PointAllApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: {
      [entity: string]: Observation[];
    };
  };
}

// response from /place/displayname
export interface DisplayNameApiResponse {
  [placeDcid: string]: string;
}

export interface PlaceStatDateWithinPlace {
  datePlaceCount: Record<string, number>;
  metadata: StatMetadata;
}

// response from /v1/stat/date/within-place
export interface GetPlaceStatDateWithinPlaceResponse {
  data: Record<string, Record<string, Array<PlaceStatDateWithinPlace>>>;
}
