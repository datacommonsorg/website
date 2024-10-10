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

import tilesCssString from "../css/tiles.scss";
import { TextTile, TextTilePropType } from "../js/components/tiles/text_tile";
import { createWebComponentElement } from "./utils";

/**
 * Web component for rendering a highlight tile.
 *
 * Example usage:
 *
 * <!-- Show some text with a link -->
 * <datacommons-text
 *   link="http://url.to/some/link"
 * >
 *  <div slot="text">Text here</div>
 * </datacommons-text>
 */
@customElement("datacommons-text")
export class DatacommonsTextComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: URL to add as a "see more" link pointer
  @property()
  link?: string;

  render(): HTMLDivElement {
    const textTileProps: TextTilePropType = {
      link: this.link,
    };
    return createWebComponentElement(TextTile, textTileProps);
  }
}
