/**
 * Copyright 2025 Google LLC
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
 * Constants and types for implementing the redirects from the Visualization Tool to the "old" tools.
 */

import { FieldToAbbreviation } from "../../tools/scatter/context";
import { TIMELINE_URL_PARAM_KEYS } from "../../tools/timeline/util";

// Explicit type for a list of DCIDs to improve readability
export type DcidList = string[];

// Chart option structure used by the visualization tool
export interface VisToolChartOption {
  date?: string;
  dcid: string;
  denom?: string;
  log?: string;
  pc?: string;
}

// Options for the "chart" parameter used by the /tools/*
export interface ChartEntry {
  date?: string;
  denom?: string;
  log?: string;
  pc?: string;
}

// Chart option structure used by the "old" tools
export type OldToolChartOptions = Record<string, ChartEntry>;

// Mapping from the hash param used by the visualization tool to
// the equivalent parameter name used by /tools/*
export interface ParamNameMapping {
  date?: string;
  dcid?: string;
  denom?: string;
  display?: string;
  l?: string; // scatter labels
  log?: string;
  pc?: string;
  place?: string;
  placeType?: string;
  q?: string; // scatter quadrants
  sv?: string;
}

// Types of charts supported by both tools
export type VisType = "map" | "scatter" | "timeline";

// Allowed values for visType hash parameter
export const ALLOWED_VIS_TOOL_TYPES = ["map", "scatter", "timeline"];

// Separator between multiple hash parameter values used by /tools/*
export const DEFAULT_PARAM_SEPARATOR = ",";

// Separator between multiple variables used by /tools/timeline
export const TIMELINE_STAT_VAR_SEPARATOR = "__"; // 2 underscores

// Mapping of visualization tool param names
// to param names used by the timeline tool
export const TIMELINE_URL_PARAM_MAPPING: ParamNameMapping = {
  place: TIMELINE_URL_PARAM_KEYS.PLACE,
  sv: TIMELINE_URL_PARAM_KEYS.STAT_VAR,
  pc: "pc",
};

// Mapping of visualization tool param names
// to param names used by the scatter tool
export const SCATTER_URL_PARAM_MAPPING: ParamNameMapping = {
  date: FieldToAbbreviation.date,
  denom: FieldToAbbreviation.denom,
  display: "display",
  l: FieldToAbbreviation.showLabels,
  log: FieldToAbbreviation.log,
  pc: FieldToAbbreviation.perCapita,
  place: FieldToAbbreviation.enclosingPlaceDcid,
  placeType: FieldToAbbreviation.enclosedPlaceType,
  q: FieldToAbbreviation.showQuadrant,
  sv: FieldToAbbreviation.statVarDcid,
};
