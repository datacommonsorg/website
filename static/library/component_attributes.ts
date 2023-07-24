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
import React from "react";

import { SortType } from "../js/chart/types";

export interface BarComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  barHeight?: number;
  childPlaceType?: string;
  colors?: string;
  horizontal?: boolean;
  lollipop?: boolean;
  maxPlaces?: number;
  parentPlace?: string;
  places?: string[];
  sort?: SortType;
  stacked?: boolean;
  title: string;
  variables: string[];
  yAxisMargin?: number;
}

export interface GaugeComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  colors?: string;
  max: number;
  min: number;
  place: string;
  title: string;
  variable: string;
}

export interface LineComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  colors?: string;
  place: string;
  title: string;
  variables: string[];
}

export interface MapComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  childPlaceType?: string;
  colors?: string;
  date?: string;
  enclosedPlaceType?: string;
  parentPlace?: string;
  place?: string;
  placeDcid?: string;
  statVarDcid?: string;
  subscribe?: string;
  title: string;
  variable: string;
}

export interface PieComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  colors?: string[];
  donut?: boolean;
  place: string;
  title: string;
  variables: string[];
}

export interface RankingComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  apiRoot?: string;
  childPlaceType: string;
  parentPlace: string;
  showLowest?: boolean;
  title: string;
  variable: string;
}

export interface SliderComponentProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  max: number;
  min: number;
  publish: string;
  value: number;
}
