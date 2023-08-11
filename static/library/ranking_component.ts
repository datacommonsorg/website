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
 *      parentPlace="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person"
 * ></datacommons-ranking>
 *
 * <!-- Show a ranking of US States by population, lowest to highest -->
 * <datacommons-ranking
 *      title="US States with the Lowest Population"
 *      parentPlace="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person"
 *      showLowest
 * ></datacommons-ranking>
 */
@customElement("datacommons-ranking")
export class DatacommonsRankingComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Title of the chart
  @property()
  header!: string;

  // DCID of the parent place
  @property()
  parentPlace!: string;

  // Type of child place to rank (ex: State, County)
  @property()
  childPlaceType!: string;

  // DCID of the statistical variable to compare values for
  @property()
  variable!: string;

  // Optional: Set to show a lowest-to-highest ranking.
  // Default: highest-to-lowest
  @property({ type: Boolean })
  showLowest: boolean;

  /**
   * @deprecated
   * Title of the chart
   */
  @property()
  title!: string;

  render(): HTMLElement {
    const rankingTileProps: RankingTilePropType = {
      apiRoot: this.apiRoot || DEFAULT_API_ENDPOINT,
      enclosedPlaceType: this.childPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: this.parentPlace,
        name: "",
        types: [],
      },
      rankingMetadata: {
        diffBaseDate: "",
        showHighest: !this.showLowest,
        showLowest: this.showLowest,
        showMultiColumn: false,
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
      title: this.header || this.title,
    };
    const mountPoint = document.createElement("div");
    ReactDOM.render(
      React.createElement(RankingTile, rankingTileProps),
      mountPoint
    );
    return mountPoint;
  }
}
