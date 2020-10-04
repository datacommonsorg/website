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
};

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
    title?: string;
    scale: boolean;
    scaling?: number;
    unit?: string;
  };
  scaling: number;
}

export interface PageChart {
  [key: string]: {
    [key: string]: ChartBlockData[];
  };
}

export interface PageData {
  pageChart: PageChart;
  allChildPlaces: {
    string: string[];
  };
  childPlaces: string[];
  parentPlaces: string[];
  similarPlaces: string[];
  nearbyPlaces: string[];
  names: { string: string };
}
