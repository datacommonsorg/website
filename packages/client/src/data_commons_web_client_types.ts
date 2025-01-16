/**
 * Copyright 2024 Google LLC
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
 * Interface definitions supporting DataCommonsWebClient
 */
export interface StatMetadata {
  importName?: string | null;
  provenanceUrl?: string | null;
  measurementMethod?: string | null;
  observationPeriod?: string | null;
  scalingFactor?: number | null;
  unit?: string | null;
  unitDisplayName?: string | null;
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

export type FacetStore = Record<string, StatMetadata>;

export type ApiNodePropvalOutResponse = {
  [entityDcid: string]: {
    provenanceId: string;
    value: string;
  }[];
};

export type DatesByVariable = {
  observationDates: {
    date: string;
    entityCount: {
      count: number;
      facet: string;
    }[];
  }[];
  variable: string;
};

/**
 * Website API response for /api/observation-dates
 */
export type ObservationDatesApiResponse = {
  datesByVariable: DatesByVariable[];
  facets: {
    [facetId: string]: {
      importName: string;
      provenanceUrl: string;
    };
  };
};

type ChartType = "BAR" | "LINE" | "MAP" | "RANKING" | "HIGHLIGHT";
export interface Chart {
  type: ChartType;
  maxPlaces?: number; 
}

export interface Place {
  dcid: string;
  name: string;
  types: string[];
}

export interface BlockConfig {
  charts: Chart[]
  childPlaceType: string;
  childPlaces: Place[];
  nearbyPlaces: Place[];
  place: Place;
  similarPlaces: Place[];
  placeScope?: string;
  title: string;
  category: string;
  description: string;
  statisticalVariableDcids: string[];
  topicDcids: string[];
  denominator?: string; // Optional
  unit?: string; // Optional
  scaling?: number; // Optional
}

/**
 * Website API response for /api/dev-place/charts/<place_dcid>
 */
export interface PlaceChartsApiResponse {
  blocks: BlockConfig[];
  place: Place;
  translatedCategoryStrings: Record<string, string>;
}

/**
 * Website API response for /api/dev-place/related-places/<place_dcid>
 */
export interface RelatedPlacesApiResponse {
  childPlaceType: string;
  childPlaces: Place[];
  nearbyPlaces: Place[];
  place: Place;
  similarPlaces: Place[];
  parentPlaces: Place[];
}
