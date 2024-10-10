/**
 * Copyright 2023 Google LLC
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

/** Interfaces for the attributes for each web component */
export type SORT_ASCENDING = "ascending";
export type SORT_DESCENDING = "descending";
export type SORT_ASCENDING_POPULATION = "ascendingPopulation";
export type SORT_DESCENDING_POPULATION = "descendingPopulation";
export type ChartSortOption =
  | SORT_ASCENDING
  | SORT_DESCENDING
  | SORT_ASCENDING_POPULATION
  | SORT_DESCENDING_POPULATION;

/**
 * Interface describing change events for web components that support publish/subscribe pattern
 * For example, if a user moves the slider on a <datacommons-slider> component to 2011, it will
 * publish an event with the ChartEventDetail:
 *
 * {
 *   property: "date",
 *   value: "2011"
 * }
 */
export interface ChartEventDetail {
  // For now only support changing the "date" attribute.
  // TODO: Support additional properties
  property: "date";
  value: string;
}

export interface BarComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  barHeight?: number;
  childPlaceType?: string;
  colors?: string;
  footnote?: string;
  header: string;
  horizontal?: boolean;
  lollipop?: boolean;
  maxPlaces?: number;
  maxVariables?: number;
  parentPlace?: string;
  places?: string;
  sort?: ChartSortOption;
  stacked?: boolean;
  title?: string;
  variables: string;
  yAxisMargin?: number;
}

export interface GaugeComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  colors?: string[];
  footnote?: string;
  header: string;
  max: number;
  min: number;
  place: string;
  title?: string;
  variable: string;
}

export interface HighlightComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  addPerCapita?: boolean;
  apiRoot?: string;
  date?: string;
  description?: string;
  header: string;
  place: string;
  variable: string;
}

export interface LineComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  childPlaceType?: string;
  colors?: string[];
  footnote?: string;
  header: string;
  place?: string;
  places?: string[];
  title?: string;
  variables: string[];
}

export type MapComponentProps = {
  apiRoot?: string;
  childPlaceType?: string;
  colors?: string[];
  date?: string;
  enclosedPlaceType?: string;
  footnote?: string;
  header: string;
  parentPlace?: string;
  place?: string;
  placeDcid?: string;
  statVarDcid?: string;
  subscribe?: string;
  title?: string;
  variable: string;
} & React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;

export interface PieComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  colors?: string[];
  donut?: boolean;
  footnote?: string;
  header: string;
  place: string;
  title?: string;
  variables: string[];
  subheader?: string;
}

export interface RankingComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  childPlaceType: string;
  header: string;
  parentPlace: string;
  showLowest?: boolean;
  title?: string;
  variable: string;
}

export interface SliderComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  max?: number;
  min?: number;
  childPlaceType?: string;
  parentPlace?: string;
  publish?: string;
  value?: number;
  variable?: string;
}

export interface TextComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  characterLimit?: number;
  heading: string;
  text: string;
  showFullText?: boolean;
}

export interface ScatterComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot: string;
  childPlaceType: string;
  header: string;
  parentPlace: string;
  variables: string;
  highlightBottomLeft?: boolean;
  highlightBottomRight?: boolean;
  highlightTopLeft?: boolean;
  highlightTopRight?: boolean;
  showPlaceLabels?: boolean;
  showQuadrants?: boolean;
  usePerCapita?: string;
  placeNameProp?: string;
  showExploreMore?: boolean;
}
