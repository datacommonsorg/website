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

export interface Series {
  [key: string]: number;
}

export interface TrendData {
  series: { string: Series };
  sources: string[];
  exploreUrl: string;
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
  hasSublevel: boolean;
  geoDcid: string;
}

export type GeoJsonFeature = GeoJSON.Feature<
  GeoJSON.MultiPolygon,
  GeoJsonFeatureProperties
>;

export interface GeoJsonData extends GeoJSON.FeatureCollection {
  type: "FeatureCollection";
  features: Array<GeoJsonFeature>;
  properties: {
    current_geo: string;
  };
}
