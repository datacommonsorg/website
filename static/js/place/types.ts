/**
 * Copyright 2020 Google LLC
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

export const chartTypeEnum = {
  LINE: "LINE",
  SINGLE_BAR: "SINGLE_BAR",
  STACK_BAR: "STACK_BAR",
  GROUP_BAR: "GROUP_BAR",
  CHOROPLETH: "CHOROPLETH",
};

export const axisEnum = {
  TIME: "TIME",
  PLACE: "PLACE",
};

export const CONTINENTS = new Set([
  "africa",
  "antarctica",
  "northamerica",
  "oceania",
  "europe",
  "asia",
  "southamerica",
]);

export const placeRelationEnum = {
  CONTAINING: "CONTAINING",
  CONTAINED: "CONTAINED",
  SIMILAR: "SIMILAR",
  NEARBY: "NEARBY",
};

export interface ConfigType {
  title: string;
  chartType: string;
  statsVars: string[];
  denominator: string[];
  source: string;
  url: string;
  axis: string;
  unit: string;
  exploreUrl: string;
  placeRelation?: string;
  relatedChart: { scale: boolean; denominator: string };
}

export interface ChartCategory {
  label: string;
  charts: ConfigType[];
  children: { label: string; charts: ConfigType[] }[];
}

export interface Series {
  [key: string]: number;
}

export interface TrendData {
  series: { string: Series };
  sources: string[];
  exploreUrl: string;
}

export interface SnapshotData {
  date: string;
  data: {
    dcid: string;
    name: string;
    data: { string: number };
  }[];
  sources: string[];
  exploreUrl: string;
}

export interface ChartBlockData {
  title: string;
  statsVars: string[];
  unit: string;
  trend: TrendData;
  parent: SnapshotData;
  similar: SnapshotData;
  nearby: SnapshotData;
  child: SnapshotData;
  relatedChart: {
    scale: boolean;
  };
  scaling: number;
  isChoropleth?: boolean;
}

export interface CategoryData {
  label: string;
  charts: ChartBlockData[];
  children: {
    label: string;
    charts: ChartBlockData[];
  }[];
}

export interface PageData {
  configData: CategoryData[];
  allChildPlaces: {
    string: string[];
  };
  childPlaces: string[];
  parentPlaces: string[];
  similarPlaces: string[];
  nearbyPlaces: string[];
  names: { string: string };
}

export interface CachedChoroplethData {
  [statVar: string]: ChoroplethDataGroup;
}

export interface ChoroplethDataGroup {
  date: string;
  data: {
    [placeDcid: string]: number;
  };
  numDataPoints: number;
}
