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
 * <!-- Note: use single quotes on outside,
 *            and double quotes inside for comparisonPlaces-->
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
  // !Important: In the web element, use double quotes inside the list, and
  //             double quotes outside the list.
  //             E.g. comparisonPlaces = '["dcid1", "dcid2"]'
  @property({ type: Array<string> })
  comparisonPlaces;

  @property()
  useLollipop: boolean;

  render(): HTMLElement {
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
      statVarSpec: [
        {
          denom: "",
          log: false,
          name: "",
          scaling: 1,
          statVar: this.variable,
          unit: "",
        },
      ],
      svgChartHeight: 200,
      title: this.title,
      useLollipop: this.useLollipop,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(BarTile, barTileProps), mountPoint);
    return mountPoint;
  }
}
