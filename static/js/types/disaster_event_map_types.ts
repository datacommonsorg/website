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

import { GeoJsonFeature, MapPoint } from "../chart/types";
import { NamedPlace, NamedTypedPlace } from "../shared/types";
import { EventTypeSpec, SeverityFilter } from "./subject_page_proto_types";

/**
 * Types used for disaster event maps
 */

// Information about the places rendered on a disaster event map.
export interface DisasterEventMapPlaceInfo {
  selectedPlace: NamedTypedPlace;
  enclosedPlaceType: string;
  parentPlaces: NamedPlace[];
}

// Information about a provenance as represented in the event API response.
interface EventApiProvenanceInfo {
  domain: string;
  importName: string;
  provenanceUrl: string;
}

// GeoLocation for an event as represented in the event API response.
interface EventApiGeoLocation {
  point?: {
    longitude: number;
    latitude: number;
  };
  polygon?: { geoJson: string };
}

// Information about an event as represented in the event API response.
interface EventApiEventInfo {
  dcid: string;
  dates: string[];
  places: string[];
  geoLocations: EventApiGeoLocation[];
  provenanceId: string;
  propVals: { [prop: string]: { vals: string[] } };
}

// Response when /api/event-data is called.
export interface DisasterEventDataApiResponse {
  eventCollection: {
    events: EventApiEventInfo[];
    provenanceInfo: Record<string, EventApiProvenanceInfo>;
  };
}

// Information about a disaster event used to render a map point.
export interface DisasterEventPoint extends MapPoint {
  disasterType: string;
  startDate: string;
  severity: { [prop: string]: number };
  displayProps?: { [prop: string]: number };
  affectedPlaces: string[];
  provenanceId: string;
  polygonGeoJson?: GeoJsonFeature;
  pathGeoJson?: GeoJsonFeature;
  endDate?: string;
}

// Data about the event points for a set of disasters.
export interface DisasterEventPointData {
  eventPoints: DisasterEventPoint[];
  provenanceInfo: Record<string, EventApiProvenanceInfo>;
}

// Data about a set of map points to show on a map.
export interface MapPointsData {
  points: DisasterEventPoint[];
  values: { [placeDcid: string]: number };
}

// List of options used when getting disaster event data.
export interface DisasterDataOptions {
  eventTypeSpec: EventTypeSpec;
  selectedDate: string;
  severityFilters: Record<string, SeverityFilter>;
  useCache: boolean;
  place: string;
}
