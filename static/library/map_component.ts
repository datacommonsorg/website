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

import { ChartEventDetail } from "../js/chart/types";
import { MapTile, MapTilePropType } from "../js/components/tiles/map_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";
import { convertArrayAttribute } from "./utils";

/**
 * Web component for rendering map tile.
 *
 * Example usage:
 *
 * <datacommons-map
 *      title="Population Below Poverty Level Status in Past Year in States of United States (2020)"
 *      parentPlace="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person_BelowPovertyLevelInThePast12Months"
 *    ></datacommons-map>
 */
@customElement("datacommons-map")
export class DatacommonsMapComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Type of child place to rank (ex: State, County)
  @property()
  childPlaceType!: string;

  // Optional: color(s) to use
  @property({ type: Array<string>, converter: convertArrayAttribute })
  colors?: string[];

  // Optional: specific date to show data for
  @property()
  date: string;

  // DCID of the parent place
  @property()
  parentPlace!: string;

  /**
   * @deprecated
   * DCID of the parent place
   * Deprecated. Use parentPlace instead.
   */
  @property()
  place!: string;

  // Optional: listen for value changes with this event name
  @property()
  subscribe: string;

  // Title of the chart
  @property()
  title!: string;

  // Statistical variable DCID
  @property()
  variable!: string;
  /**
   * @deprecated
   * DCID of the parent place
   * Deprecated. Use parentPlace instead.
   */
  @property()
  placeDcid: string;

  /**
   * @deprecated
   * Type of child place to rank (ex: State, County)
   * Deprecated. Use childPlaceType instead.
   */
  @property()
  enclosedPlaceType: string;

  /**
   * @deprecated
   * Statistical variable DCID
   * Deprecated. Use variable instead.
   */
  @property()
  statVarDcid: string;

  firstUpdated(): void {
    if (this.subscribe) {
      this.parentElement.addEventListener(
        this.subscribe,
        (e: CustomEvent<ChartEventDetail>) => {
          if (e.detail.property === "date") {
            this.date = e.detail.value;
          }
        }
      );
    }
  }

  render(): HTMLElement {
    const place = this.parentPlace || this.place || this.placeDcid;
    const variable = this.variable || this.statVarDcid;
    const childPlaceType = this.childPlaceType || this.enclosedPlaceType;
    const mapTileProps: MapTilePropType = {
      apiRoot: this.apiRoot || DEFAULT_API_ENDPOINT,
      colors: this.colors,
      enclosedPlaceType: childPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: place,
        name: "",
        types: [],
      },
      statVarSpec: {
        denom: "",
        log: false,
        name: "",
        scaling: 1,
        statVar: variable,
        unit: "",
        date: this.date,
      },
      svgChartHeight: 200,
      title: this.title,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(React.createElement(MapTile, mapTileProps), mountPoint);
    return mountPoint;
  }
}
