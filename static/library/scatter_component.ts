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

import { css, CSSResult, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";

import tilesCssString from "!!raw-loader!sass-loader!../css/tiles.scss";

import {
  ScatterTile,
  ScatterTilePropType,
} from "../js/components/tiles/scatter_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";
import { convertArrayAttribute } from "./utils";

/**
 * Web component for rendering the datacommons scatter tile.
 *
 * Example usage:
 *
 * <datacommons-scatter
 *      title="Population vs Median Household Income for US States"
 *      parentPlace="country/USA"
 *      childPlaceTYpe="State"
 *      variables="Count_Person Median_Income_Household"
 * ></datacommons-scatter>
 */
@customElement("datacommons-scatter")
export class DatacommonsScatterComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Child place type to plot
  @property()
  childPlaceType: string;

  // Title of the chart
  @property()
  header!: string;

  // DCID of the parent place
  @property()
  parentPlace!: string;

  // Statistical variable DCIDs
  @property({ type: Array<string>, converter: convertArrayAttribute })
  variables!: Array<string>;

  // Optional: whether to label top left outlier points
  // Defaults to false
  @property({ type: Boolean })
  highlightBottomLeft?: boolean;

  // Optional: whether to label top right outlier points
  // Defaults to false
  @property({ type: Boolean })
  highlightBottomRight?: boolean;

  // Optional: whether to label top left outlier points
  // Defaults to false
  @property({ type: Boolean })
  highlightTopLeft?: boolean;

  // Optional: whether to label top right outlier points
  // Defaults to false
  @property({ type: Boolean })
  highlightTopRight?: boolean;

  // Optional: whether to label points with places
  // Defaults to false
  @property({ type: Boolean })
  showPlaceLabels?: boolean;

  // Optional: whether to show grid lines delimiting quadrants
  @property({ type: Boolean })
  showQuadrants?: boolean;

  render(): HTMLElement {
    const tileProps: ScatterTilePropType = {
      apiRoot: this.apiRoot || DEFAULT_API_ENDPOINT,
      enclosedPlaceType: this.childPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: this.parentPlace,
        name: "",
        types: [],
      },
      scatterTileSpec: {
        highlightBottomLeft: this.highlightBottomLeft,
        highlightBottomRight: this.highlightBottomRight,
        highlightTopLeft: this.highlightTopLeft,
        highlightTopRight: this.highlightTopRight,
        showPlaceLabels: this.showPlaceLabels,
        showQuadrants: this.showQuadrants,
      },
      statVarSpec: this.variables.map((variable) => ({
        denom: "",
        log: false,
        name: "",
        scaling: 1,
        statVar: variable,
        unit: "",
      })),
      svgChartHeight: 200,
      title: this.header,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(ScatterTile, tileProps), mountPoint);
    return mountPoint;
  }
}
