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

import { DataCommonsWebClient } from "@datacommonsorg/client";
import { ChartEventDetail } from "@datacommonsorg/web-components";
import { css, CSSResult, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { DATE_HIGHEST_COVERAGE, DATE_LATEST } from "../js/shared/constants";
import {
  convertArrayAttribute,
  convertBooleanAttribute,
  getApiRoot,
  getObservationDateRange,
} from "./utils";

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
 * <!-- Map that subscribes to slider changes -->
 * <datacommons-map
 *   childPlaceType="State"
 *   date="HIGHEST_COVERAGE"
 *   title="Population of US States (${date})"
 *   place="country/USA"
 *   subscribe="dc-map"
 *   variable="Count_Person"
 * >
 *   <div slot="footer">
 *     <datacommons-slider
 *       parentPlace="country/USA"
 *       childPlaceType="State"
 *       publish="dc-map"
 *       variable="Count_Person"
 *     ></datacommons-slider>
 *   </div>
 * </datacommons-map>
 *
 * <!-- Bar chart that subscribes to slider changes -->
 * <datacommons-bar
 *   places="geoId/06 geoId/11 geoId/12"
 *   date="HIGHEST_COVERAGE"
 *   title="Life expectancy vs Median age in California, the District of Columbia, and Florida (${date})"
 *   subscribe="dc-bar"
 *   variables="LifeExpectancy_Person Median_Age_Person"
 * >
 *   <div slot="footer">
 *     <datacommons-slider
 *       places="geoId/06 geoId/11 geoId/12"
 *       publish="dc-bar"
 *       variables="LifeExpectancy_Person Median_Age_Person"
 *     ></datacommons-slider>
 *   </div>
 * </datacommons-bar>
 */
@customElement("datacommons-slider")
export class DatacommonsSliderComponent extends LitElement {
  static styles: CSSResult = css`
    .container {
      display: flex;
      flex-direction: column;
      margin: 1rem 0;
      padding: 0 24px;
    }
    .row {
      align-items: top;
      display: flex;
      flex-direction: row;
      width: 100%;
    }
    .row.options {
      align-items: center;
      flex-direction: row;
      flex-wrap: wrap-reverse;
      gap: 6px;
      justify-content: space-between;
      margin-top: 2px;
      &.single-option {
        justify-content: flex-end;
      }
      .slider-date-footnote {
        color: #777777;
        font-size: 12px;
        margin-left: 4px;
      }
    }
    .row.slider {
      margin: 1rem 0;
      .slider-control {
        flex-grow: 1;
        padding: 4px 16px 0;
        input[type="range"] {
          appearance: none;
          background: #e9e9e9;
          flex-grow: 1;
          height: 5px;
          width: 100%;
        }
      }
      .slider-label {
        color: #555;
        font-size: 12px;
        margin: 0 8px;
        padding-top: 12px;
        position: relative;
        .slider-label-text {
          position: absolute;
          width: 100%;
        }
        .slider-label-text-inner {
          position: absolute;
          text-align: center;
          transform: translate(-50%, 0);
        }
      }
      &.disabled {
        /** Hack to get the slider to show up as disabled in chrome */
        z-index: 1;
        input[type="range"]::-webkit-slider-thumb {
          background: #e9e9e9;
          display: none;
        }
      }
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      color: #333;
      input[type="checkbox"] {
        width: 14px;
        margin-right: 8px;
      }
    }
    .label {
      flex-shrink: 0;
      font-weight: 400;
      font-size: 0.8rem;
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
      margin: 0;
      font-weight: 400;
      font-size: 14px;
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
   * Type of child place (ex: State, County)
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
   * DCIDs of places
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  places?: string[];

  /**
   * Event name to publish on slider change
   */
  @property()
  publish: string;

  /**
   * Set to true to show trends summary checkbox
   */
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showTrendsSummary: boolean;

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
   * List of DCIDs of the statistical variable(s) to plot values for
   */
  @property({ type: Array<string>, converter: convertArrayAttribute })
  variables?: string[];

  /**
   * Slider date range
   */
  @state()
  private _dates: string[];

  /**
   * Currently selected value
   */
  @state()
  private _errorMessage = "";

  /**
   * Date with highest data coverage
   */
  @state()
  private _highestCoverageDate = "";

  /**
   * Loading indicator
   */
  @state()
  private _isLoading = false;

  /**
   * Set to true if trends sumamry is selected
   */
  @state()
  private _showTrendsSummaryEnabled: boolean;

  /**
   * Minimum trend summary date
   */
  @state()
  private _trendSummaryMinDate: string;

  /**
   * Maximum trend summary date
   */
  @state()
  private _trendSummaryMaxDate: string;

  /**
   * Currently selected slider value
   */
  @state()
  private _value: number;

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
    this._showTrendsSummaryEnabled = false;
    this.fetchObservationDates();
  }

  render(): TemplateResult {
    // Slider requires a variable and either parentPlace + childPlace type or a list of places
    const isValid =
      (this.variable || this.variables) &&
      ((this.parentPlace && this.childPlaceType) || this.places);

    if (!isValid) {
      return html`
        <div class="container error" part="container">
          <h4>datacommons-slider</h4>
          <div>
            Please specify all of the attributes: "variable", "parentPlace", and
            "childPlaceType".
          </div>
        </div>
      `;
    }
    if (this._errorMessage) {
      return html`
        <div class="container error" part="container">
          <h4>datacommons-slider</h4>
          <div>${this._errorMessage}</div>
        </div>
      `;
    }
    if (this._isLoading || !this._dates) {
      return html`<div class="container" part="container">Loading...</div>`;
    }

    const startDate = this._dates[0];
    const endDate = this._dates[this._dates.length - 1];
    // Normalized slider value as a percent between 0 and 100
    const normalizedSliderValue =
      this._showTrendsSummaryEnabled || this._dates.length <= 1
        ? 100
        : (this._value / (this._dates.length - 1)) * 100;

    const dateText = this.getDateText();
    const lastDateIndex = this._dates.length - 1;
    const isHighestCoverageDate =
      dateText === this._highestCoverageDate && !this._showTrendsSummaryEnabled;

    // Text to show under range slider button.
    // Shows asterisk if showing date of highest coverage
    let sliderLabelText = this._showTrendsSummaryEnabled ? "" : dateText;
    if (isHighestCoverageDate) {
      sliderLabelText += "*";
    }
    return html`
      <div class="container" part="container">
        ${this.header
          ? html`<h4 part="header">${this.header}</h4>`
          : this.defaultHeader()}

        <div
          class="row slider ${this._showTrendsSummaryEnabled ? "disabled" : ""}"
        >
          <div class="label">${startDate}</div>
          <div class="slider-control">
            <input
              class="slider"
              max="${lastDateIndex}"
              min="0"
              title="${dateText}"
              type="range"
              .value="${this._showTrendsSummaryEnabled
                ? lastDateIndex
                : this._value}"
              @change=${this.onSliderChange}
              @input=${this.onSliderInput}
              ?disabled=${this._showTrendsSummaryEnabled}
            />
            <div class="slider-label">
              <div
                class="slider-label-text"
                style="left:${normalizedSliderValue}%;"
              >
                <span class="slider-label-text-inner">${sliderLabelText}</span>
              </div>
            </div>
          </div>
          <div class="label">${endDate}</div>
        </div>

        <div
          class="row options${!this.showTrendsSummary ? " single-option" : ""}"
        >
          ${this.showTrendsSummary
            ? html` <label class="checkbox-label"
                ><input
                  type="checkbox"
                  @change=${this.onShowTrendsSummaryChange}
                  ?checked=${this._showTrendsSummaryEnabled}
                />
                <span
                  >Show trends summary
                  ${this._showTrendsSummaryEnabled
                    ? html`(${this._trendSummaryMinDate} to
                      ${this._trendSummaryMaxDate})`
                    : null}</span
                ></label
              >`
            : null}
          ${isHighestCoverageDate
            ? html`<span class="slider-date-footnote"
                >* Most recent date with highest coverage</span
              >`
            : html`<span class="slider-date-footnote">&nbsp;</span>`}
        </div>
      </div>
    `;
  }

  private defaultHeader() {
    return html`<h4 part="header">Explore trends over time</h4>`;
  }

  private getDateText() {
    if (this._value < 0 || this._value >= this._dates.length) {
      return "Unknown";
    }
    return this._dates[this._value];
  }

  private getEndDateText() {
    if (this._dates.length === 0) {
      return "Unknown";
    }
    return this._dates[this._dates.length - 1];
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

  private onShowTrendsSummaryChange(e: Event): void {
    const target = e.currentTarget as HTMLInputElement;
    this._showTrendsSummaryEnabled = target.checked;
    const dateValue =
      this._value < this._dates.length ? this._dates[this._value] : undefined;
    const dispatchedDateValue = this._showTrendsSummaryEnabled
      ? DATE_LATEST
      : dateValue;
    this.dispatchEvent(
      new CustomEvent<ChartEventDetail>(this.publish, {
        bubbles: true,
        detail: {
          property: "date",
          value: dispatchedDateValue,
        },
      })
    );
  }

  private async fetchObservationDates() {
    const apiRoot = getApiRoot(this.apiRoot);
    const dataCommonsWebClient = new DataCommonsWebClient({ apiRoot });
    if (
      (!this.places && (!this.parentPlace || !this.childPlaceType)) ||
      (!this.variable && !this.variables)
    ) {
      console.log("No place found in the slider");
      return;
    }
    const variables = this.variable ? [this.variable] : this.variables;
    const firstVariable = variables[0];
    const apiPath = this.places
      ? "api/observation-dates/entities"
      : "api/observation-dates";
    this._isLoading = true;
    const params = new URLSearchParams();
    if (this.parentPlace && this.childPlaceType) {
      params.set("parentEntity", this.parentPlace);
      params.set("childType", this.childPlaceType);
    } else {
      this.places.forEach((place) => params.append("entities", place));
    }

    if (this.places) {
      variables.forEach((variable) => params.append("variables", variable));
    } else {
      params.set("variable", firstVariable);
    }

    const url = `${apiRoot}/${apiPath}?${params.toString()}`;
    const result = await fetch(url);
    const resultObj = (await result.json()) as ObservationDatesResponse;
    this._isLoading = false;

    if (this.showTrendsSummary) {
      const trendsSummaryResult = this.places
        ? await dataCommonsWebClient.getObservationsPoint({
            entities: this.places,
            variables,
            date: DATE_LATEST,
          })
        : await dataCommonsWebClient.getObservationsPointWithin({
            parentEntity: this.parentPlace,
            childType: this.childPlaceType,
            variables,
            date: DATE_LATEST,
          });
      const { minDate, maxDate } = getObservationDateRange(trendsSummaryResult);
      this._trendSummaryMinDate = minDate;
      this._trendSummaryMaxDate = maxDate;
    }
    const highestCoverageResult = this.places
      ? await await dataCommonsWebClient.getObservationsPoint({
          entities: this.places,
          variables,
          date: DATE_HIGHEST_COVERAGE,
        })
      : await dataCommonsWebClient.getObservationsPointWithin({
          parentEntity: this.parentPlace,
          childType: this.childPlaceType,
          variables,
          date: DATE_HIGHEST_COVERAGE,
        });
    this._highestCoverageDate = "";
    const highestCoveragePlaces = Object.keys(
      highestCoverageResult.data[firstVariable]
    );
    if (highestCoveragePlaces.length > 0) {
      this._highestCoverageDate =
        highestCoverageResult.data[firstVariable][
          highestCoveragePlaces[0]
        ].date;
    }

    if (
      resultObj.datesByVariable.length > 0 &&
      resultObj.datesByVariable[0].observationDates
    ) {
      this._dates = resultObj.datesByVariable[0].observationDates.map(
        (od) => od.date
      );
    } else {
      this._errorMessage = `No date range found for (variable: ${firstVariable},  parentPlace: ${this.parentPlace}, childPlaceType: ${this.childPlaceType})`;
    }

    if (this._highestCoverageDate) {
      // Show HIGHEST_COVERAGE data on initial load
      const highestCoverageDateIndex = this._dates.indexOf(
        this._highestCoverageDate
      );
      if (highestCoverageDateIndex >= 0) {
        this._value = highestCoverageDateIndex;
      }
    } else {
      this._value = this._dates.length - 1;
    }
  }
}
