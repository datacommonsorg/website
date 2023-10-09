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

import tilesCssString from "!!raw-loader!sass-loader!../css/tiles.scss";

import {
  GaugeTile,
  GaugeTilePropType,
} from "../js/components/tiles/gauge_tile";
import {
  convertArrayAttribute,
  createWebComponentElement,
  getApiRoot,
} from "./utils";

/**
 * Web component for rendering a gauge tile.
 *
 * Example usage:
 *
 * <!-- Show a gauge of the percentage of people who are internet users
 *      in the US -->
 * <datacommons-gauge
 *      title="Percentage of US Population that are Internet Users"
 *      place="country/USA"
 *      variable="Count_Person_IsInternetUser_PerCapita"
 *      min="0"
 *      max="100"
 * ></datacommons-gauge>
 */
@customElement("datacommons-gauge")
export class DatacommonsGaugeComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Optional: colors to use
  @property({ type: Array<string>, converter: convertArrayAttribute })
  colors?: string[];

  // Title of the chart
  @property()
  header!: string;

  // Maximum value of gauge range
  @property()
  max: number;

  // Minimum value of gauge range
  @property()
  min: number;

  // DCID of the parent place
  @property()
  place!: string;

  /**
   * @deprecated
   * Title of the chart
   */
  @property()
  title!: string;

  // DCID of the statistical variable to compare values for
  @property()
  variable!: string;

  render(): HTMLElement {
    const gaugeTileProps: GaugeTilePropType = {
      apiRoot: getApiRoot(this.apiRoot),
      colors: this.colors,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: this.place,
        name: "",
        types: [],
      },
      range: {
        min: this.min,
        max: this.max,
      },
      svgChartHeight: 200,
      statVarSpec: {
        denom: "",
        log: false,
        name: "",
        scaling: 1,
        statVar: this.variable,
        unit: "",
      },
      title: this.header || this.title,
    };
    return createWebComponentElement(GaugeTile, gaugeTileProps);
  }
}
