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
  GaugeTile,
  GaugeTilePropType,
} from "../js/components/tiles/gauge_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";

/**
 * Web component for rendering a gauge tile.
 *
 * Example usage:
 *
 * <!-- Show a ranking of US States by population, highest to lowest -->
 * <datacommons-gauge
 *      title="US States with the Highest Population"
 *      place="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person"
 * ></datacommons-gauge>
 *
 * <!-- Show a gauge of US States by population, lowest to highest -->
 * <datacommons-gauge
 *      title="US States with the Lowest Population"
 *      place="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person"
 *      showLowest=true
 * ></datacommons-gauge>
 */
@customElement("datacommons-gauge")
export class DatacommonsGaugeComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Title of the chart
  @property()
  title!: string;

  // DCID of the parent place
  @property()
  place!: string;

  // DCID of the statistical variable to compare values for
  @property()
  variable!: string;

  render(): HTMLElement {
    const gaugeTileProps: GaugeTilePropType = {
      apiRoot: DEFAULT_API_ENDPOINT,
      description: this.title,
      place: {
        dcid: this.place,
        name: "",
        types: [],
      },
      statVarSpec: {
        denom: "",
        log: false,
        name: "",
        scaling: 1,
        statVar: this.variable,
        unit: "",
      },
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(GaugeTile, gaugeTileProps), mountPoint);
    return mountPoint;
  }
}
