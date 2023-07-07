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
  DonutTile,
  DonutTilePropType,
} from "../js/components/tiles/donut_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";
import { convertArrayAttribute } from "./utils";

/**
 * Web component for rendering a donut chart tile.
 *
 * Example usage:
 *
 * <!-- Show a pie chart of median income by gender in California -->
 * <datacommons-pie
 *      title="Median Income by gender in California"
 *      place="geoId/06"
 *      comparisonVariables='["Median_Income_Person_15OrMoreYears_Male_WithIncome", "Median_Income_Person_15OrMoreYears_Female_WithIncome"]'
 * ></datacommons-pie>
 *
 * <!-- Show a donut chart of median income by gender in California -->
 * <datacommons-pie
 *      title="Median Income by gender in California"
 *      place="geoId/06"
 *      comparisonVariables='["Median_Income_Person_15OrMoreYears_Male_WithIncome", "Median_Income_Person_15OrMoreYears_Female_WithIncome"]'
 *      donut
 * ></datacommons-pie>
 */
@customElement("datacommons-pie")
export class DatacommonsPieComponent extends LitElement {
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

  // List of DCIDs of statistical variables to plot
  // !Important: variables provided must cover all cases (sum of values takes
  //             up the full circle)
  @property({ type: Array<string>, converter: convertArrayAttribute })
  comparisonVariables;

  // Optional: Whether to draw as donut chart instead of a pie chart
  // Set to true to draw a donut chart
  @property({ type: Boolean })
  donut;

  render(): HTMLElement {
    const statVarSpec = [];
    this.comparisonVariables.forEach((statVarDcid) => {
      statVarSpec.push({
        denom: "",
        log: false,
        name: "",
        scaling: 1,
        statVar: statVarDcid,
        unit: "",
      });
    });
    const donutTileProps: DonutTilePropType = {
      apiRoot: DEFAULT_API_ENDPOINT,
      id: `chart-${_.uniqueId()}`,
      pie: !this.donut,
      place: {
        dcid: this.place,
        name: "",
        types: [],
      },
      statVarSpec,
      svgChartHeight: 200,
      title: this.title,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(DonutTile, donutTileProps), mountPoint);
    return mountPoint;
  }
}
