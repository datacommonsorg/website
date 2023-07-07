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

import { DataGroup } from "./base";

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
    currentGeo: string;
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

export interface ChartOptions {
  apiRoot?: string;
  unit?: string;
}

export interface GroupLineChartOptions extends ChartOptions {
  ylabel?: string;
  modelsDataGroupsDict?: { [place: string]: DataGroup[] };
}
export interface HistogramOptions extends ChartOptions {
  fillColor?: string;
}

export interface HorizontalBarChartOptions extends ChartOptions {
  stacked?: boolean;
  style?: {
    barHeight?: number;
    yAxisMargin?: number;
  };
}

export interface LineChartOptions extends ChartOptions {
  handleDotClick?: (dotData: DotDataPoint) => void;
}

export type SORT_ASCENDING = "ascending";
export type SORT_DESCENDING = "descending";
export type SORT_ASCENDING_POPULATION = "ascendingPopulation";
export type SORT_DESCENDING_POPULATION = "descendingPopulation";
export type SortType =
  | SORT_ASCENDING
  | SORT_DESCENDING
  | SORT_ASCENDING_POPULATION
  | SORT_DESCENDING_POPULATION;
