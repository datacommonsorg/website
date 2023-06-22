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
 * <datacommons-ranking
 *      title="Population Below Poverty Level Status in Past Year in States of United States (2020)"
 *      placeDcid="country/USA"
 *      enclosedPlaceType="State"
 *      statVarName="Population Below Poverty Level Status in Past Year"
 *      statVarDcid="Count_Person_BelowPovertyLevelInThePast12Months"
 *    ></datacommons-ranking>
 */
@customElement("datacommons-ranking")
export class DatacommonsRankingComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  @property()
  title!: string;

  @property()
  placeDcid!: string;

  @property()
  enclosedPlaceType!: string;

  @property()
  variableDcid!: string;

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
