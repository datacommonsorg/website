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
 * Struct to hold a place with dcid and display name. This is commonly used
 * throughout the repo.
 *
 * TODO(shifucun): migrate existing code to use this struct whenever possible.
 */
export interface NamedNode {
  name: string;
  dcid: string;
}

export interface NamedTypedNode {
  name: string;
  dcid: string;
  types: Array<string>;
  provenanceId?: string;
}

export type NamedPlace = NamedNode;
export type NamedTypedPlace = NamedTypedNode;

/**
 * Place with name and population.
 */
export interface NamedPopPlace {
  dcid: string;
  name: string;
  pop: number;
}

export type ChildPlacesByType = Record<string, Array<NamedTypedPlace>>;

/**
 * Enum type of the stat var hierarchy wizard.
 */
export const StatVarHierarchyType = {
  BROWSER: "BROWSER",
  TIMELINE: "TIMELINE",
  SCATTER: "SCATTER",
  MAP: "MAP",
  STAT_VAR: "STAT_VAR",
  DOWNLOAD: "DOWNLOAD",
};

/**
 * The set of StatVarHierarchyTypes where selection is a radio button.
 */
export const RADIO_BUTTON_TYPES = new Set([
  StatVarHierarchyType.MAP,
  StatVarHierarchyType.STAT_VAR,
]);

export interface StatVarInfo {
  id: string;
  specializedEntity: string;
  displayName: string;
  hasData: boolean;
}

export interface StatVarGroupInfo {
  id: string;
  specializedEntity: string;
  displayName: string;
  descendentStatVarCount: number;
}

export interface StatVarGroupNodeType {
  absoluteName: string;
  level: number;
  parent?: string;
  childStatVarGroups?: Array<{ id: string; specializedEntity: string }>;
  childStatVars?: StatVarNodeType[];
  descendentStatVarCount?: number;
}

export interface StatVarNodeType {
  displayName: string;
  id: string;
  searchName: string;
  parent: string;
  level: number;
}

export enum StatVarHierarchyNodeType {
  STAT_VAR_GROUP,
  STAT_VAR,
}

export interface Boundary {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface PlaceSummary {
  dcid: string;
  name: string;
}

export interface PlaceTypeSummary {
  placeCount: number;
  topPlaces: PlaceSummary[];
  minValue: number;
  maxValue: number;
}

interface SeriesKey {
  measurementMethod?: string;
  observationPeriod?: string;
  scalingFactor?: string;
  unit?: string;
  isDcAggregate?: boolean;
}

interface SeriesSummary {
  seriesKey: SeriesKey;
  earliestDate: string;
  latestDate: string;
  observationCount: number;
  timeSeriesCount: number;
  placeTypeSummary: { [placeType: string]: PlaceTypeSummary };
}

export interface ProvenanceSummary {
  importName: string;
  observationCount: number;
  timeSeriesCount: number;
  releaseFrequency?: number;
  seriesSummary: SeriesSummary[];
}

export interface StatVarSummary {
  placeTypeSummary: { [placeType: string]: PlaceTypeSummary };
  provenanceSummary?: { [provId: string]: ProvenanceSummary };
}

// One node in a Graph.
export interface GraphNode {
  value: string;
  neighbors?: LinkedNodes[];
}

// Linked nodes for a Graph
export interface LinkedNodes {
  property: string;
  direction: string;
  nodes: GraphNode[];
}

export interface GraphNodes {
  nodes: GraphNode[];
}

// Result for a single stat var group. From /api/stats/stat-var-search
export interface SvgSearchResult {
  dcid: string;
  name: string;
  statVars?: Array<NamedNode>;
}

// Full result from /api/stats/stat-var-search
export interface StatVarSearchResult {
  statVarGroups: SvgSearchResult[];
  statVars: NamedNode[];
  matches: string[];
}

// Set new property gtag on window.
declare global {
  interface Window {
    gtag: (
      event: string,
      eventName: string,
      parameter: Record<string, string | string[]>
    ) => void;
  }
}

export interface StatVarSpec {
  statVar: string;
  denom: string;
  unit: string;
  scaling: number;
  log: boolean;
  name?: string;
  date?: string;
}

export interface SampleDates {
  facetDates: Record<string, Array<string>>;
  bestFacet: string;
}

// metadata associated with a single data point in the map charts
export interface DataPointMetadata {
  popDate: string;
  popSource: string;
  placeStatDate: string;
  statVarSource: string;
  errorMessage?: string;
}
