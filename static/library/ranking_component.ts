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

import tilesCssString from "!!raw-loader!sass-loader!../css/tiles.scss";

import {
  RankingTile,
  RankingTilePropType,
} from "../js/components/tiles/ranking_tile";
import { DEFAULT_PER_CAPITA_DENOM } from "./constants";
import {
  convertArrayAttribute,
  convertBooleanAttribute,
  createWebComponentElement,
  getApiRoot,
} from "./utils";

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

  // Type of child place to rank (ex: State, County)
  @property()
  childPlaceType!: string;

  // Title of the chart
  @property()
  header!: string;

  // Optional: Set to true to hide the footer with download link
  // default: false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  hideFooter?: boolean;

  // Optional: Title of chart, but only shown if a highest-to-lowest ranking is
  //           being shown
  @property()
  highestTitle?: string;

  // Optional: Title of the chart, but only shown if a lowest-to-highest ranking
  //           is being shown
  @property()
  lowestTitle?: string;

  // DCID of the parent place
  @property()
  parentPlace!: string;

  // Optional: List of variable DCIDs to plot per capita
  @property({ type: Array<string>, converter: convertArrayAttribute })
  perCapita?: string[];

  // Optional: How many places to show, e.g. "N" in "Top-N"
  // Defaults to 5.
  @property()
  rankingCount?: number;

  // Optional: Set to true to show an "explore more" link to visualization tools
  // Default: false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showExploreMore?: boolean;

  // Optional: Set to true to show a highest-to-lowest ranking
  // Default: highest-to-lowest, if showHighestLowest is false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showHighest?: boolean;

  // Optional: Set to true to show both top and bottom places in highest-to-lowest order.
  // Default: only show top places
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showHighestLowest?: boolean;

  // Optional: Set to true to show a lowest-to-highest ranking
  // Default: highest-to-lowest, if showHighestLowest is false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showLowest?: boolean;

  // Optional: Set to true to allow table to spread across multiple columns
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showMultiColumn?: boolean;

  /**
   * @deprecated
   * Title of the chart
   */
  @property()
  title!: string;

  // DCID of the statistical variable to rank values for
  @property()
  variable!: string;

  // List of DCIDs of the statistical variable to rank values for
  @property({ type: Array<string>, converter: convertArrayAttribute })
  variables?: string[];

  // Optional: List of sources for this component
  @property({ type: Array<string>, converter: convertArrayAttribute })
  sources?: string[];

  render(): HTMLDivElement {
    const variables = this.variables || [this.variable];
    const statVarSpecs = variables.map((statVar) => {
      return {
        denom:
          this.perCapita && this.perCapita.includes(statVar)
            ? DEFAULT_PER_CAPITA_DENOM
            : "",
        log: false,
        name: "",
        scaling: 1,
        statVar,
        unit: "",
      };
    });

    const rankingTileProps: RankingTilePropType = {
      apiRoot: getApiRoot(this.apiRoot),
      enclosedPlaceType: this.childPlaceType,
      hideFooter: this.hideFooter,
      id: `chart-${_.uniqueId()}`,
      parentPlace: this.parentPlace,
      rankingMetadata: {
        highestTitle: this.highestTitle,
        lowestTitle: this.lowestTitle,
        rankingCount: this.rankingCount || 5,
        showHighest: !this.showLowest && !this.showHighestLowest,
        showHighestLowest: this.showHighestLowest,
        showLowest: this.showLowest,
        showMultiColumn: this.showMultiColumn || false,
      },
      showExploreMore: this.showExploreMore,
      sources: this.sources,
      variables: statVarSpecs,
      title: this.header || this.title,
    };
    return createWebComponentElement(RankingTile, rankingTileProps);
  }
}
