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

export type NamedPlace = NamedNode;

/**
 * Place with name and its types.
 */
export interface NamedTypedPlace {
  dcid: string;
  name: string;
  types: Array<string>;
}

/**
 * Enum type of the stat var hierarchy wizard.
 */
export const StatVarHierarchyType = {
  BROWSER: "BROWSER",
  TIMELINE: "TIMELINE",
  SCATTER: "SCATTER",
  MAP: "MAP",
  STAT_VAR: "STAT_VAR",
};

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
  numDescendentStatVars: number;
}

export interface StatVarGroupNodeType {
  absoluteName: string;
  level: number;
  parent?: string;
  childStatVarGroups?: Array<{ id: string; specializedEntity: string }>;
  childStatVars?: StatVarNodeType[];
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
  personCount: number;
}

export interface PlaceTypeSummary {
  numPlaces: number;
  topPlaces: PlaceSummary[];
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
  numObservations: number;
  numTimeSeries: number;
  placeTypeSummary: { [placeType: string]: PlaceTypeSummary };
}

export interface ProvenanceSummary {
  importName: string;
  numObservations: number;
  numTimeSeries: number;
  releaseFrequency?: number;
  seriesSummary: SeriesSummary[];
}

export interface StatVarSummary {
  placeTypeSummary: { [placeType: string]: PlaceTypeSummary };
  provenanceSummary?: { [provId: string]: ProvenanceSummary };
}

// One node in a Graph.
export interface GraphNode {
  neighbors: LinkedNodes[];
  value: string;
}

// Linked nodes for a Graph
export interface LinkedNodes {
  property: string;
  direction: number;
  nodes: GraphNode[];
}

export interface GraphNodes {
  nodes: GraphNode[];
}
