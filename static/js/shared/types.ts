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
 * Enum type of the stat var hierarchy wizard.
 */
export const StatVarHierarchyType = {
  BROWSER: "BROWSER",
  TIMELINE: "TIMELINE",
  SCATTER: "SCATTER",
  MAP: "MAP",
};

export interface StatVarInfo {
  id: string;
  specializedEntity: string;
  displayName: string;
}

export interface StatVarGroupInfo {
  id: string;
  specializedEntity: string;
  displayName: string;
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
