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

import { SortType } from "../js/chart/types";
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
 *      parentPlace="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person"
 * ></datacommons-bar>
 *
 * <!-- Show a bar chart of population for specific US states -->
 * <datacommons-bar
 *      title="Population of US States"
 *      variable="Count_Person"
 *      places="geoId/01 geoId/02"
 * ></datacommons-bar>
 *
 * <!-- Stacked bar chart of population for specific US states -->
 * <datacommons-bar
 *      title="Population of US States"
 *      variableDcid="Count_Person"
 *      places="geoId/01 geoId/02"
 *      stacked
 * <!-- Horizontal stacked bar chart -->
 * <datacommons-bar
 *   title="Median income by gender"
 *   variables="Median_Income_Person_15OrMoreYears_Male_WithIncome Median_Income_Person_15OrMoreYears_Female_WithIncome"
 *   places="geoId/01 geoId/02 geoId/04 geoId/20 geoId/21 geoId/22 geoId/23 geoId/24 geoId/25"
 *   stacked
 *   horizontal
 *   sort="descending"
 * ></datacommons-bar>
 *
 * <!-- Lollipop chart of population for specific US states -->
 * <datacommons-bar
 *      title="Population of US States"
 *      variableDcid="Count_Person"
 *      places="geoId/01 geoId/02"
 *      lollipop
 * ></datacommons-bar>
 */
@customElement("datacommons-bar")
export class DatacommonsBarComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  /**
   * Bar height for horizontal bar charts. Default: 30px.
   */
  @property({ type: Number })
  barHeight?: number;

  /**
   * Type of child places to plot (ex: State, County)
   */
  @property()
  childPlaceType!: string;

  /**
   * Optional: list of specific colors to use in the chart.
   * The number of colors passed in should equal the number of variables.
   * The order of colors should match the order of variables.
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  colors?: string[];

  /**
   * Optional: Render bars horizontally instead of vertically
   */
  @property({ type: Boolean })
  horizontal?: boolean;

  /**
   * Optional: Draw as a lollipop chart instead of bars
   */
  @property({ type: Boolean })
  lollipop: boolean;

  /**
   * Optional: Maximum number of child places or comparison places to display
   * Defaults to 7
   */
  @property({ type: Number })
  maxPlaces?: number;

  /**
   * DCID of the parent place
   * */
  @property()
  parentPlace!: string;

  /* Optional: List of DCIDs of places to plot
   * If provided, place and enclosePlaceType will be ignored
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  places?: string[];

  /**
   * Optional: Bar chart sort order.
   * Options: ascending, descending, ascendingPopulation, descendingPopulation
   * Default: descendingPopulation
   */
  @property()
  sort?: SortType;

  /**
   * Optional: Draw as a stacked chart instead of grouped chart
   */
  @property({ type: Boolean })
  stacked?: boolean;

  /**
   * Title of the chart
   */
  @property()
  title!: string;

  /**
   * List of DCIDs of the statistical variable(s) to plot values for
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  variables?: string[];

  /**
   * Optional: Y axis margin to fit the axis label text.
   * Default: 60px
   */
  @property({ type: Number })
  yAxisMargin?: number;

  render(): HTMLElement {
    const statVarDcids: string[] = this.variables;
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
      barHeight: this.barHeight,
      colors: this.colors,
      comparisonPlaces: this.places,
      enclosedPlaceType: this.childPlaceType,
      horizontal: this.horizontal,
      id: `chart-${_.uniqueId()}`,
      maxPlaces: this.maxPlaces,
      place: {
        dcid: this.parentPlace,
        name: "",
        types: [],
      },
      sort: this.sort,
      stacked: this.stacked,
      statVarSpec,
      svgChartHeight: 200,
      title: this.title,
      useLollipop: this.lollipop,
      yAxisMargin: this.yAxisMargin,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(BarTile, barTileProps), mountPoint);
    return mountPoint;
  }
}
