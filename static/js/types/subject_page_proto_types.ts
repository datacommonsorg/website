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
 * Types for subject_page.proto
 * TODO(beets): Generate this file automatically with ts-protoc-gen
 */

import { StatVarSpec } from "../shared/types";

export interface SeverityFilter {
  prop: string;
  displayName?: string;
  unit: string;
  upperLimit: number;
  lowerLimit: number;
}

export interface EventDisplayProp {
  prop: string;
  displayName: string;
  unit?: string;
}

export interface EventTypeSpec {
  id: string;
  name: string;
  eventTypeDcids: string[];
  color: string;
  defaultSeverityFilter: SeverityFilter;
  displayProp: EventDisplayProp[];
  endDateProp: string[];
  polygonGeoJsonProp?: string;
  pathGeoJsonProp?: string;
}

export interface PageMetadataConfig {
  topicId: string;
  topicName: string;
  // Map of parent type to child place type.
  containedPlaceTypes: Record<string, string>;
  // Map of event type id to event type spec.
  eventTypeSpec: Record<string, EventTypeSpec>;
}

export interface RankingTileSpec {
  showHighest: boolean;
  showLowest: boolean;

  highestTitle?: string;
  lowestTitle?: string;
  rankingCount?: number;

  showMultiColumn: boolean;
  showHighestLowest?: boolean;
}

export interface DisasterEventMapTileSpec {
  pointEventTypeKey: string[];
  polygonEventTypeKey: string[];
  pathEventTypeKey: string[];
}

export interface HistogramTileSpec {
  eventTypeKey: string;
  prop: string;
}

export interface TopEventTileSpec {
  eventTypeKey: string;
  displayProp: string[];
  showStartDate: boolean;
  showEndDate: boolean;
  reverseSort: boolean;
  rankingCount?: number;
}

export interface ScatterTileSpec {
  highlightTopRight?: boolean;
  highlightTopLeft?: boolean;
  highlightBottomRight?: boolean;
  highlightBottomLeft?: boolean;
  showPlaceLabels?: boolean;
  showQuadrants?: boolean;
}

export interface BarTileSpec {
  xLabelLinkRoot?: string;
  barHeight?: number;
  colors?: string[];
  horizontal?: boolean;
  maxPlaces?: number;
  maxVariables?: number;
  sort?: string;
  stacked?: boolean;
  useLollipop?: boolean;
  yAxisMargin?: number;
  variableNameRegex?: string;
  defaultVariableName?: string;
}

export interface GaugeTileSpec {
  colors?: string[];
  range: {
    min: number;
    max: number;
  };
}

export interface DonutTileSpec {
  colors?: string[];
  pie?: boolean;
}

export interface LineTileSpec {
  colors?: string[];
  timeScale?: "YEAR" | "MONTH" | "DAY";
  variableNameRegex?: string;
  defaultVariableName?: string;
  startDate?: string;
  endDate?: string;
  highlightDate?: string;
}

export interface MapTileSpec {
  colors?: string[];
  geoJsonProp?: string;
}

export interface DisplayValueSpec {
  values: string[];
  sources: string[];
}

export interface AnswerMessageTileSpec {
  propertyExpr?: string;
  displayValue?: DisplayValueSpec;
}

export interface AnswerTableColumn {
  header: string;
  propertyExpr: string;
}

export interface AnswerTableTileSpec {
  columns: AnswerTableColumn[];
}

export interface TileConfig {
  title?: string;
  description: string;
  type: string;
  statVarKey: string[];
  comparisonPlaces?: string[];
  placeDcidOverride?: string;
  hideFooter?: boolean;
  subtitle?: string;
  placeNameProp?: string;
  entities?: string[];
  rankingTileSpec?: RankingTileSpec;
  disasterEventMapTileSpec?: DisasterEventMapTileSpec;
  topEventTileSpec?: TopEventTileSpec;
  scatterTileSpec?: ScatterTileSpec;
  histogramTileSpec?: HistogramTileSpec;
  barTileSpec?: BarTileSpec;
  gaugeTileSpec?: GaugeTileSpec;
  donutTileSpec?: DonutTileSpec;
  lineTileSpec?: LineTileSpec;
  mapTileSpec?: MapTileSpec;
  answerMessageTileSpec?: AnswerMessageTileSpec;
  answerTableTileSpec?: AnswerTableTileSpec;
}

export interface ColumnConfig {
  tiles: TileConfig[];
}

export interface DisasterBlockSpec {
  dateRange?: string;
  date?: string;
}

export interface BlockConfig {
  title?: string;
  description?: string;
  footnote?: string;
  columns: ColumnConfig[];
  type?: string;
  denom?: string;
  startWithDenom?: boolean;
  disasterBlockSpec?: DisasterBlockSpec;
  infoMessage?: string;
}

export type StatVarSpecMap = Record<string, StatVarSpec>;

export interface CategoryConfig {
  title: string;
  description?: string;
  statVarSpec?: StatVarSpecMap;
  blocks: BlockConfig[];
  dcid?: string;
  url?: string;
}

export interface SubjectPageConfig {
  metadata: PageMetadataConfig;
  categories: CategoryConfig[];
}
