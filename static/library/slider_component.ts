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

import { css, CSSResult, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

import { ChartEventDetail } from "../js/chart/types";

/**
 * Slider web component
 * Broadcasts its value as the specified event name
 *
 * Example usage:
 *
 * <!-- Date slider example  -->
 * <datacommons-slider
 *      max="2023"
 *      min="1950"
 *      publish="dc-year"
 *      value="2023"
 * ></datacommons-slider>
 *
 * <!-- Map that subscribes to slider changes -->
 * <datacommons-map
 *      title="Population"
 *      place="country/USA"
 *      childPlaceType="State"
 *      subscribe="dc-map"
 *      variable="Count_Person"
 * ></datacommons-map>
 */
@customElement("datacommons-slider")
export class DatacommonsSliderComponent extends LitElement {
  static styles: CSSResult = css`
    .container {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin: 16px 0;
    }
    .row {
      display: flex;
      width: 100%;
      flex-direction: row;
    }
    .label {
      flex-shrink: 0;
    }
    input {
      flex-grow: 1;
      margin: 0 16px;
    }
    .value {
      display: flex;
      justify-content: center;
      font-weight: bold;
    }
  `;

  /**
   * Maximum slider value
   */
  @property({ type: Number })
  max: number;

  /**
   * Minimum slider value
   */
  @property({ type: Number })
  min: number;

  /**
   * Event name to publish on slider change
   */
  @property()
  publish: string;

  /**
   * Initial slider value
   */
  @property({ type: Number })
  value: number;

  render(): TemplateResult {
    return html`
      <div class="container">
        <div class="row">
          <div class="label">${this.min}</div>
          <input
            class="slider"
            max="${this.max}"
            min="${this.min}"
            title="${this.value}"
            type="range"
            value="${this.value}"
            @change=${this.onSliderChange}
          />
          <div class="label">${this.max}</div>
        </div>
        <div class="value">${this.value}</div>
      </div>
    `;
  }

  private onSliderChange(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    const value = target.value;
    this.value = Number(value);
    this.dispatchEvent(
      new CustomEvent<ChartEventDetail>(this.publish, {
        bubbles: true,
        detail: {
          property: "date",
          value,
        },
      })
    );
  }
}
