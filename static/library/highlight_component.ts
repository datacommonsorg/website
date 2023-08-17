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
import React from "react";
import ReactDOM from "react-dom";

import tilesCssString from "!!raw-loader!sass-loader!../css/tiles.scss";

import {
  HighlightTile,
  HighlightTilePropType,
} from "../js/components/tiles/highlight_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";
import { createWebComponentElement } from "./utils";

/**
 * Web component for rendering a highlight tile.
 *
 * Example usage:
 *
 * <!-- Show a highlight of the current population of the United States -->
 * <datacommons-highlight
 *      title="Population of the United States"
 *      place="country/USA"
 *      variable="Count_Person"
 * ></datacommons-highlight>
 */
@customElement("datacommons-highlight")
export class DatacommonsHighlightComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Optional: Date to fetch data for
  @property()
  date?: string;

  // Text to accompany the variable value
  @property()
  header!: string;

  // DCID of the place to get data for
  @property()
  place!: string;

  /**
   * @deprecated
   * Text to accompany the variable value
   */
  @property()
  description!: string;

  // Optional: Unit of the variable
  @property()
  unit?: string;

  // List of DCIDs of the statistical variable(s) to plot values for
  @property()
  variable!: string;

  render(): HTMLElement {
    const highlightTileProps: HighlightTilePropType = {
      apiRoot: this.apiRoot || DEFAULT_API_ENDPOINT,
      date: this.date,
      description: this.header || this.description,
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
        unit: this.unit || "",
      },
    };
    return createWebComponentElement(HighlightTile, highlightTileProps);
  }
}
