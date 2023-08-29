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
import { customElement, property, state } from "lit/decorators.js";

import { ChartEventDetail } from "../js/chart/types";
import { DEFAULT_API_ENDPOINT } from "./constants";
import { convertArrayAttribute } from "./utils";

const MOST_RECENT_TEXT = "Most recent";
const MOST_RECENT_TEXT_LONG = "Most recently available";
interface ObservationDatesByVariable {
  observationDates: {
    date: string;
    entityCount: {
      count: number;
      facet: string;
    }[];
  }[];
  variable: string;
}
interface ObservationDatesResponse {
  datesByVariable: ObservationDatesByVariable[];
  facets: {
    [facet: string]: {
      importName: string;
      measurementMethod: string;
      provenanceUrl: string;
    };
  };
}

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
    .component {
      border: var(--border-primary);
      border-radius: var(--border-radius-primary);
      margin: 1rem 0;
      padding: 24px;
    }
    .container {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .row {
      display: flex;
      margin-top: 8px;
      width: 100%;
      flex-direction: row;
    }
    .label {
      flex-shrink: 0;
      font-weight: 400;
      font-size: 0.8rem;
    }
    input {
      flex-grow: 1;
      margin: 0 16px;
    }
    .value {
      display: flex;
      justify-content: flex-start;
      font-weight: 500;
      font-size: 11px;
      margin-bottom: 1rem;
    }
    .value-text {
      margin-left: 2px;
    }
    .error {
      color: red;
      font-weight: 400;
      font-family: monospace;
    }
    h4 {
      padding: 0;
      margin: 0 0 2px 0;
      font-weight: 500;
      font-size: 1rem;
    }
  `;

  /**
   * @deprecated
   * Maximum slider value
   * Deprecated. Use dates property instead.
   */
  @property()
  max: string;

  /**
   * @deprecated
   * Minimum slider value.
   * Deprecated. Use dates property instead
   */
  @property()
  min: string;
  /**
   * Optional: API root to use to fetch data
   * Defaults to https://datacommons.org
   */
  @property()
  apiRoot: string;

  /**
   * Type of child place to rank (ex: State, County)
   */
  @property()
  childPlaceType: string;

  /**
   * Optional: List of date values
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  dates?: string[];

  /**
   * Optional: Header text
   */
  @property()
  header?: string;

  /**
   * DCID of the parent place
   */
  @property()
  parentPlace: string;

  /**
   * Event name to publish on slider change
   */
  @property()
  publish: string;

  /**
   * Initial slider value
   */
  @property()
  value: string;

  /**
   * Statistical variable
   */
  @property()
  variable: string;

  /**
   * Slider date range
   */
  @state()
  private _dates: string[];

  /**
   * Currently selected slider value
   */
  @state()
  private _value: number;

  /**
   * Loading indicator
   */
  @state()
  private _isLoading: boolean = false;

  /**
   * Currently selected value
   */
  @state()
  private _errorMessage: string = "";

  connectedCallback(): void {
    super.connectedCallback();
    if (this.min && this.max) {
      this._dates = [this.min, this.max];
    }
    if (this.dates) {
      this._dates = [...this.dates];
    }
    if (this.value) {
      this._value = Number(this.value);
      if (
        isNaN(this._value) ||
        this._value < 0 ||
        this._value > this._dates.length
      ) {
        this._value = this._dates.length;
      }
    } else {
      this._value = 0;
    }
    this.fetchObservationDates();
  }

  render(): TemplateResult {
    if (this._isLoading) {
      return html`<div class="component">Loading...</div>`;
    }
    if (this._errorMessage) {
      return html`
        <div class="component error">
          <h4>datacommons-slider</h4>
          <div>${this._errorMessage}</div>
        </div>
      `;
    }
    if (!this._dates || this._dates.length === 0) {
      return html`
        <div class="component error">
          <h4>datacommons-slider</h4>
          <div>
            Please specify either the "dates" attribute or all of the
            attributes: "variable", "parentPlace", and "childPlaceType".
          </div>
        </div>
      `;
    }

    return html`
      <div class="component">
        <div class="container">
          ${this.header
            ? html`<h4 part="header">${this.header}</h4>`
            : this.defaultHeader()}
          <div class="row">
            <div class="label">${this._dates[0]}</div>
            <input
              class="slider"
              max="${this._dates.length}"
              min="0"
              title="${this.getValueText()}"
              type="range"
              value="${this._value}"
              @change=${this.onSliderChange}
              @input=${this.onSliderInput}
            />
            <div class="label">${MOST_RECENT_TEXT}</div>
          </div>
        </div>
      </div>
    `;
  }

  private defaultHeader() {
    if (this._value === this._dates.length) {
      return html`<h4 part="header">Showing most recently available data</h4>`;
    } else {
      return html`<h4 part="header">
        Showing data from ${this.getValueText()}
      </h4>`;
    }
  }

  private getValueText() {
    if (this._value < 0 || this._value > this._dates.length) {
      return "Unknown";
    } else if (this._value === this._dates.length) {
      return MOST_RECENT_TEXT;
    } else {
      return this._dates[this._value];
    }
  }

  private onSliderChange(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    const newValue = Number(target.value);
    this._value = newValue;
    const dateValue =
      this._value < this._dates.length ? this._dates[this._value] : undefined;
    this.dispatchEvent(
      new CustomEvent<ChartEventDetail>(this.publish, {
        bubbles: true,
        detail: {
          property: "date",
          value: dateValue,
        },
      })
    );
  }

  private onSliderInput(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    const newValue = Number(target.value);
    this._value = newValue;
  }

  private async fetchObservationDates() {
    const apiRoot = `${this.apiRoot || DEFAULT_API_ENDPOINT}`;
    const apiPath = "api/observation-dates";
    if (!this.parentPlace || !this.childPlaceType || !this.variable) {
      console.log("No place found in the slider");
      return;
    }
    this._isLoading = true;
    const params = new URLSearchParams();
    params.set("parentEntity", this.parentPlace);
    params.set("childType", this.childPlaceType);
    params.set("variable", this.variable);

    const url = `${apiRoot}/${apiPath}?${params.toString()}`;
    const result = await fetch(url);
    const resultObj = (await result.json()) as ObservationDatesResponse;
    console.log("!! RESULT!", resultObj);
    this._isLoading = false;

    if (
      resultObj.datesByVariable.length > 0 &&
      resultObj.datesByVariable[0].observationDates
    ) {
      this._dates = resultObj.datesByVariable[0].observationDates.map(
        (od) => od.date
      );
    } else {
      this._errorMessage = `No date range found for (variable: ${this.variable},  parentPlace: ${this.parentPlace}, childPlaceType: ${this.childPlaceType})`;
    }
    this._value = this._dates.length;
  }
}
