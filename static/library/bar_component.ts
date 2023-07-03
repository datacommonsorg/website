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

import { BarTile, BarTilePropType } from "../js/components/tiles/bar_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";
import { convertArrayAttribute } from "./utils";

/**
 * Web component for rendering a bar chart tile.
 *
 * Example usage:
 *
 * <!-- Show a bar chart of population for states in the US -->
 * <datacommons-bar
 *      title="Population of US States"
 *      place="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person"
 * ></datacommons-bar>
 *
 * <!-- Show a bar chart of population for specific US states -->
 * <datacommons-bar
 *      title="Population of US States"
 *      variableDcid="Count_Person"
 *      comparisonPlaces='["geoId/01", "geoId/02"]'
 * ></datacommons-bar>
 */
@customElement("datacommons-bar")
export class DatacommonsBarComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  /**
   * Draw as a stacked chart instead of grouped chart
   */
  @property({ type: Boolean })
  stacked?: boolean;

  // Title of the chart
  @property()
  title!: string;

  // DCID of the parent place
  @property()
  place!: string;

  // Type of child places to plot (ex: State, County)
  @property()
  childPlaceType!: string;

  // DCID of the statistical variable to plot values for
  @property()
  variable!: string;

  // Optional: List of DCIDs of places to plot
  // If provided, place and enclosePlaceType will be ignored
  @property({ type: Array<string>, converter: convertArrayAttribute })
  comparisonPlaces;

  // Optional: List of DCIDs of statistical variables to plot
  // If provided, the "variable" attribute will be ignored.
  // !Important: variables provided must share the same unit
  @property({ type: Array<string>, converter: convertArrayAttribute })
  comparisonVariables;

  render(): HTMLElement {
    const statVarDcids: string[] = this.comparisonVariables
      ? this.comparisonVariables
      : [this.variable];
    const statVarSpec = [];
    statVarDcids.forEach((statVarDcid) => {
      statVarSpec.push({
        denom: "",
        log: false,
        name: "",
        scaling: 1,
        statVar: statVarDcid,
        unit: "",
      });
    });
    const barTileProps: BarTilePropType = {
      apiRoot: DEFAULT_API_ENDPOINT,
      comparisonPlaces: this.comparisonPlaces,
      enclosedPlaceType: this.childPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: this.place,
        name: "",
        types: [],
      },
      stacked: this.stacked,
      statVarSpec,
      svgChartHeight: 200,
      title: this.title,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(BarTile, barTileProps), mountPoint);
    return mountPoint;
  }
}
