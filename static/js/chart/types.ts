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

import { RankingPoint } from "../types/ranking_unit_types";

export const chartTypeEnum = {
  LINE: "LINE",
  STACK_BAR: "STACK_BAR",
  GROUP_BAR: "GROUP_BAR",
  CHOROPLETH: "CHOROPLETH",
  GROUP_LINE: "GROUP_LINE",
  HISTOGRAM: "HISTOGRAM",
  RANKING: "RANKING",
};

export interface Series {
  [key: string]: number;
}

// TrendData represents a set of time series to be used in a multi-line chart.
export interface TrendData {
  series: { [key: string]: Series };
  sources: string[];
  exploreUrl?: string;
  statsVars?: string[];
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
  statsVars?: string[];
}

export interface ChartBlockData {
  title: string;
  statsVars: string[];
  denominator?: string[];
  unit: string;
  trend: TrendData;
  parent: SnapshotData;
  similar: SnapshotData;
  nearby: SnapshotData;
  child: SnapshotData;
  relatedChart: {
    title?: string;
    scale: boolean;
    scaling?: number;
    unit?: string;
  };
  scaling: number;
  isChoropleth?: boolean;
  isRankingChart?: boolean;
}

export interface PageChart {
  [key: string]: {
    [key: string]: ChartBlockData[];
  };
}

export interface PageHighlight {
  [title: string]: SnapshotData;
}

export interface PageData {
  pageChart: PageChart;
  allChildPlaces: {
    string: string[];
  };
  childPlacesType: string;
  childPlaces: string[];
  parentPlaces: string[];
  similarPlaces: string[];
  nearbyPlaces: string[];
  categories: { string: string };
  names: { string: string };
  highlight: PageHighlight;
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
  exploreUrl: string;
  sources: string[];
}

export interface GeoJsonFeatureProperties {
  name: string;
  geoDcid: string;
  pop?: number;
}

export type GeoJsonFeature = GeoJSON.Feature<
  GeoJSON.MultiPolygon | GeoJSON.MultiLineString,
  GeoJsonFeatureProperties
>;

export interface GeoJsonData extends GeoJSON.FeatureCollection {
  type: "FeatureCollection";
  features: Array<GeoJsonFeature>;
  properties: {
    current_geo: string;
  };
}

export interface DotDataPoint {
  label: string;
  time: number;
  value: number;
}

export interface MapPoint {
  placeDcid: string;
  placeName: string;
  latitude: number;
  longitude: number;
}

// RankingChartDataGroup represents the rankings of several places based on a specific stat var.
// It is used for the ranking chart.
export interface RankingChartDataGroup {
  date: string;
  data: {
    rank: number;
    value: number;
    placeDcid: string;
    placeName: string;
  }[];
  numDataPoints: number;
  exploreUrl: string;
  sources: string[];
  // Optional for storing the processed rankingData
  rankingData?: { lowest: RankingPoint[]; highest: RankingPoint[] };
}

// A map from statvar dcid to RankingChartDataGroup
export type CachedRankingChartData = Record<string, RankingChartDataGroup>;
