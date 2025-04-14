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

export interface PageHighlight {
  [title: string]: SnapshotData;
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
  // specific colors to use
  colors?: string[];
  // whether to draw chart in lollipop style, used for bar charts
  lollipop?: boolean;
  // whether to draw tooltips on hover
  showTooltipOnHover?: boolean;
  // list of stat var DCIDs, in the order the colors should be applied
  statVarColorOrder?: string[];
  unit?: string;
  // Use an svg version of the legend that is added as part of the svg chart and
  // has no interactions.
  useSvgLegend?: boolean;
  // If set, adds title to the top of the chart
  title?: string;
  // Optional: Disable the place href link for this component
  disableEntityLink?: boolean;
}

export interface GroupLineChartOptions extends ChartOptions {
  ylabel?: string;
  modelsDataGroupsDict?: { [place: string]: DataGroup[] };
}
export interface HistogramOptions extends ChartOptions {
  fillColor?: string;
}

export interface HorizontalBarChartOptions extends ChartOptions {
  showTooltipOnHover?: boolean;
  stacked?: boolean;
  style?: {
    barHeight?: number;
    yAxisMargin?: number;
  };
}

export type TimeScaleOption = "year" | "month" | "day";

export interface LineChartOptions extends ChartOptions {
  handleDotClick?: (dotData: DotDataPoint) => void;
  timeScale?: TimeScaleOption;
  // If set, all other dots should be removed and only the dot at this date
  // should be shown, If showAllDots is also set, all other dots will still be
  // shown, but this one will be slightly larger.
  highlightDate?: string;
  // If set to true, should show all data points as dots on the line
  showAllDots?: boolean;
}
