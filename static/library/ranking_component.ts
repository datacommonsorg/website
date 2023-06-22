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
  RankingTile,
  RankingTilePropType,
} from "../js/components/tiles/ranking_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";

/**
 * Web component for rendering a ranking tile.
 *
 * Example usage:
 *
 * <!-- Show a ranking of US States by population, highest to lowest -->
 * <datacommons-ranking
 *      title="US States with the Highest Population"
 *      placeDcid="country/USA"
 *      enclosedPlaceType="State"
 *      statVarDcid="Count_Person"
 *    ></datacommons-ranking>
 *
 * <!-- Show a ranking of US States by population, lowest to highest -->
 * <datacommons-ranking
 *      title="US States with the Lowest Population"
 *      placeDcid="country/USA"
 *      enclosedPlaceType="State"
 *      statVarDcid="Count_Person"
 *      showLowest=true
 *    ></datacommons-ranking>
 */
@customElement("datacommons-ranking")
export class DatacommonsRankingComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Title of the chart
  @property()
  title!: string;

  // DCID of the parent place
  @property()
  placeDcid!: string;

  // Type of child place to rank (ex: State, County)
  @property()
  enclosedPlaceType!: string;

  // DCID of the statistical variable to compare values for
  @property()
  variableDcid!: string;

  // Optional: whether to show a lowest-to-highest ranking
  // If not specified, defaults to highest-to-lowest
  // To show places with lowest value first, set showLowest=true
  @property()
  showLowest: boolean;

  render(): HTMLElement {
    const rankingTileProps: RankingTilePropType = {
      apiRoot: DEFAULT_API_ENDPOINT,
      enclosedPlaceType: this.enclosedPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: this.placeDcid,
        name: "",
        types: [],
      },
      statVarSpec: [
        {
          denom: "",
          log: false,
          name: "",
          scaling: 1,
          statVar: this.variableDcid,
          unit: "",
        },
      ],
      rankingMetadata: {
        diffBaseDate: "",
        showHighest: !this.showLowest,
        showLowest: this.showLowest,
        showMultiColumn: false,
      },
      title: this.title,
    };
    const mountPoint = document.createElement("span");
    ReactDOM.render(
      React.createElement(RankingTile, rankingTileProps),
      mountPoint
    );
    return mountPoint;
  }
}
