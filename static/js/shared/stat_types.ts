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
  unitDisplayName?: string;
}

export interface Observation {
  date: string;
  value: number;
  facet?: string;
  unitDisplayName?: string;
}

export interface EntityObservation {
  [entity: string]: Observation;
}

export interface EntityObservationWrapper {
  data: EntityObservation;
  facets: FacetStore;
}

export interface EntityObservationList {
  [entity: string]: Observation[];
}

export interface EntityObservationListWrapper {
  data: EntityObservationList;
  facets: FacetStore;
}

export interface Series {
  // series field is guaranteed to set from Flask.
  series: Observation[];
  facet?: string;
  earliestDate?: string;
  latestDate?: string;
  obsCount?: number;
}

export interface EntitySeries {
  [entity: string]: Series;
}

export interface EntitySeriesWrapper {
  data: EntitySeries;
  facets: FacetStore;
}

export interface EntitySeriesList {
  [entity: string]: Series[];
}

export interface SeriesApiResponse {
  facets: FacetStore;
  data: {
    [variable: string]: EntitySeries;
  };
}

export interface SeriesAllApiResponse {
  facets: FacetStore;
  data: {
    [variable: string]: EntitySeriesList;
  };
}

export interface PointApiResponse {
  facets: FacetStore;
  data: {
    [variable: string]: EntityObservation;
  };
}

export interface PointAllApiResponse {
  facets: FacetStore;
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

export interface ObservationDate {
  date: string;
  entityCount: {
    count: number;
    facet: string;
  }[];
}

export interface ObservationDatesWrapper {
  data: ObservationDate[];
  facets: FacetStore;
}

export interface ObservationDatesResponse {
  datesByVariable: [
    {
      variable: string;
      observationDates: ObservationDate[];
    }
  ];
  facets: FacetStore;
}

export type FacetStore = Record<string, StatMetadata>;
