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

import tilesCssString from "!!raw-loader!sass-loader!../css/tiles.scss";

import { TextTile, TextTilePropType } from "../js/components/tiles/text_tile";
import { DEFAULT_API_ENDPOINT } from "./constants";
import { createWebComponentElement } from "./utils";

/**
 * Web component for rendering a highlight tile.
 *
 * Example usage:
 *
 * <!-- Show companion text to UN SDG 1 we have in the KG -->
 * <datacommons-text
 *      node="dc/topic/SDG_1"
 * ></datacommons-text>
 */
@customElement("datacommons-text")
export class DatacommonsTextComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Optional: override of the story title
  @property()
  header?: string;

  // Optional: override of the story body text
  @property()
  text?: string;

  // DCID of the node to get text annotation for
  @property()
  node!: string;

  render(): HTMLElement {
    const textTileProps: TextTilePropType = {
      apiRoot: this.apiRoot || DEFAULT_API_ENDPOINT,
      heading: this.header,
      text: this.text,
      node: this.node,
    };
    return createWebComponentElement(TextTile, textTileProps);
  }
}
