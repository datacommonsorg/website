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

import React from "react";
import ReactDOM from "react-dom";
import { BarTile, BarTilePropType } from "../js/components/tiles/bar_tile";
import { LineTile, LineTilePropType } from "../js/components/tiles/line_tile";
import { MapTile, MapTilePropType } from "../js/components/tiles/map_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";

/**
 * Renders bar chart tile component in the given HTML element
 * @param element DOM element to render the chart
 * @param props bar chart tile component properties
 */
export const renderBarComponent = (
  element: HTMLElement,
  props: BarTilePropType
): void => {
  ReactDOM.render(
    React.createElement(BarTile, {
      apiRoot: DEFAULT_API_ENDPOINT, // Overwritten if set in props below
      ...props,
    }),
    element
  );
};

/**
 * Renders line chart tile component in the given HTML element
 * @param element DOM element to render the chart
 * @param props line chart tile component properties
 */
export const renderLineComponent = (
  element: HTMLElement,
  props: LineTilePropType
): void => {
  ReactDOM.render(
    React.createElement(LineTile, {
      apiRoot: DEFAULT_API_ENDPOINT, // Overwritten if set in props below
      ...props,
    }),
    element
  );
};

/**
 * Renders map chart tile component in the given HTML element
 * @param element DOM element to render the chart
 * @param props map chart tile component properties
 */
export const renderMapComponent = (
  element: HTMLElement,
  props: MapTilePropType
): void => {
  ReactDOM.render(
    React.createElement(MapTile, {
      apiRoot: DEFAULT_API_ENDPOINT, // Overwritten if set in props below
      ...props,
    }),
    element
  );
};
