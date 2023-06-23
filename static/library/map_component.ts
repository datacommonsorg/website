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

import { MapTile, MapTilePropType } from "../js/components/tiles/map_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";

/**
 * Web component for rendering map tile.
 *
 * Example usage:
 *
 * <datacommons-map
 *      title="Population Below Poverty Level Status in Past Year in States of United States (2020)"
 *      place="country/USA"
 *      enclosedPlaceType="State"
 *      variable="Count_Person_BelowPovertyLevelInThePast12Months"
 *    ></datacommons-map>
 */
@customElement("datacommons-map")
export class DatacommonsMapComponent extends LitElement {
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

  // Type of child place to rank (ex: State, County)
  @property()
  enclosedPlaceType!: string;

  // Statistical variable DCID
  @property()
  variable!: string;

  render(): HTMLElement {
    const mapTileProps: MapTilePropType = {
      apiRoot: DEFAULT_API_ENDPOINT,
      enclosedPlaceType: this.enclosedPlaceType,
      id: `chart-${_.uniqueId()}`,
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
      svgChartHeight: 200,
      title: this.title,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(MapTile, mapTileProps), mountPoint);
    return mountPoint;
  }
}
