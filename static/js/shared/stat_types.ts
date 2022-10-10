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

export interface EntityObservation {
  [entity: string]: Observation;
}

export interface EntityObservationList {
  [entity: string]: Observation[];
}

export interface Series {
  // series field is guaranteed to set from Flask.
  series: Observation[];
  facet?: string;
}

export interface EntitySeries {
  [entity: string]: Series;
}

export interface EntitySeriesList {
  [entity: string]: Series[];
}

export interface SeriesApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: EntitySeries;
  };
}

export interface SeriesAllApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: EntitySeriesList;
  };
}

export interface PointApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: EntityObservation;
  };
}

export interface PointAllApiResponse {
  facets: Record<string, StatMetadata>;
  data: {
    [variable: string]: EntityObservationList;
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
