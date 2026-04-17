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
  ScatterTile,
  ScatterTilePropType,
} from "../js/components/tiles/scatter_tile";
import { WEB_COMPONENT_SURFACE } from "./constants";
import {
  convertArrayAttribute,
  convertBooleanAttribute,
  createWebComponentElement,
  getApiRoot,
} from "./utils";

/**
 * Web component for rendering the datacommons scatter tile.
 *
 * Example usage:
 *
 * <datacommons-scatter
 *      title="Population vs Median Household Income for US States"
 *      parentPlace="country/USA"
 *      childPlaceTYpe="State"
 *      variables="Count_Person Median_Income_Household"
 * ></datacommons-scatter>
 */
@customElement("datacommons-scatter")
export class DatacommonsScatterComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Child place type to plot
  @property()
  childPlaceType: string;

  // Title of the chart
  @property()
  header!: string;

  // DCID of the parent place
  @property()
  parentPlace!: string;

  // Statistical variable DCIDs
  @property({ type: Array<string>, converter: convertArrayAttribute })
  variables!: Array<string>;

  // Optional: whether to label top left outlier points
  // Defaults to false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  highlightBottomLeft?: boolean;

  // Optional: whether to label top right outlier points
  // Defaults to false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  highlightBottomRight?: boolean;

  // Optional: whether to label top left outlier points
  // Defaults to false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  highlightTopLeft?: boolean;

  // Optional: whether to label top right outlier points
  // Defaults to false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  highlightTopRight?: boolean;

  // Optional: whether to label points with places
  // Defaults to false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showPlaceLabels?: boolean;

  // Optional: whether to show grid lines delimiting quadrants
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showQuadrants?: boolean;

  // Optional: list of statvars to plot in per capita instead of raw value
  @property({ type: Array<string>, converter: convertArrayAttribute })
  usePerCapita?: string[];

  // Optional: Property to use to get place names
  @property()
  placeNameProp: string;

  // Optional: Whether to show the "explore" link.
  // Default: false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showExploreMore: boolean;

  // Optional: List of sources for this component
  @property({ type: Array<string>, converter: convertArrayAttribute })
  sources?: string[];

  /**
   * Optional: List of facet IDs to use for variables
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  facetIds?: string[];

  /**
   * Optional: JSON mapping of variable DCID to facet ID
   */
  @property()
  facetMapping?: string;

  /**
   * Optional: Facet ID to use for all variables
   */
  @property()
  facetId?: string;

  render(): HTMLDivElement {
    const scatterTileProps: ScatterTilePropType = {
      apiRoot: getApiRoot(this.apiRoot),
      enclosedPlaceType: this.childPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: this.parentPlace,
        name: "",
        types: [],
      },
      scatterTileSpec: {
        highlightBottomLeft: this.highlightBottomLeft,
        highlightBottomRight: this.highlightBottomRight,
        highlightTopLeft: this.highlightTopLeft,
        highlightTopRight: this.highlightTopRight,
        showPlaceLabels: this.showPlaceLabels,
        showQuadrants: this.showQuadrants,
      },
      showExploreMore: this.showExploreMore,
      sources: this.sources,
      statVarSpec: this.variables.map((variable, index) => {
        let facetId = "";
        if (this.facetMapping) {
          try {
            const mapping = JSON.parse(this.facetMapping);
            facetId = mapping[variable] || "";
          } catch (e) {
            // Ignore JSON parse error
          }
        } else if (this.facetIds) {
          if (this.facetIds.length === 1) {
            facetId = this.facetIds[0];
          } else if (this.facetIds.length > index) {
            facetId = this.facetIds[index];
          }
        } else if (this.facetId) {
          facetId = this.facetId;
        }
        return {
          denom: this.usePerCapita?.includes(variable) ? "Count_Person" : "",
          log: false,
          name: "",
          scaling: 1,
          statVar: variable,
          unit: "",
          facetId,
        };
      }),
      svgChartHeight: 200,
      title: this.header,
      placeNameProp: this.placeNameProp,
      surface: WEB_COMPONENT_SURFACE,
    };
    return createWebComponentElement(ScatterTile, scatterTileProps);
  }
}
