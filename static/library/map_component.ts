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

import tilesCssString from "!!raw-loader!sass-loader!../css/tiles.scss";
import { css, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import _ from "lodash";
import React from "react";
import ReactDOM from "react-dom";
import { MapTile, MapTilePropType } from "../js/components/tiles/map_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";

/**
 * Web component for rendering map tile.
 *
 * Example usage:
 *
 * <datacommons-map
 *      title="Population Below Poverty Level Status in Past Year in States of United States (2020)"
 *      placeDcid="country/USA"
 *      placeName="United States of America"
 *      placeTypes="Country"
 *      enclosedPlaceType="State"
 *      statVarName="Population Below Poverty Level Status in Past Year"
 *      statVarDcid="Count_Person_BelowPovertyLevelInThePast12Months"
 *    ></datacommons-map>
 */
@customElement("datacommons-map")
export class DatacommonsMapComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles = css`
    ${unsafeCSS(tilesCssString)}
  `;

  @property()
  title!: string;

  @property()
  placeDcid!: string;

  @property()
  placeName!: string;

  @property()
  placeTypes!: string[];

  @property()
  enclosedPlaceType!: string;

  @property()
  statVarName!: string;

  @property()
  statVarDcid!: string;

  render() {
    const mapTileProps: MapTilePropType = {
      apiRoot: DEFAULT_API_ENDPOINT,
      id: `chart-${_.uniqueId()}`,
      svgChartHeight: 200,
      title: this.title,
      place: {
        dcid: this.placeDcid,
        name: this.placeName,
        types: this.placeTypes,
      },
      enclosedPlaceType: this.enclosedPlaceType,
      statVarSpec: {
        denom: "",
        name: this.statVarName,
        log: false,
        scaling: 1,
        statVar: this.statVarDcid,
        unit: "",
      },
    };
    const mountPoint = document.createElement("span");
    ReactDOM.render(React.createElement(MapTile, mapTileProps), mountPoint);
    return mountPoint;
  }
}
