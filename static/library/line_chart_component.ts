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

import { TimeScaleOption } from "../js/chart/types";
import { LineTile, LineTilePropType } from "../js/components/tiles/line_tile";
import { DEFAULT_PER_CAPITA_DENOM } from "./constants";
import {
  convertArrayAttribute,
  convertBooleanAttribute,
  createWebComponentElement,
  getApiRoot,
  getVariableNameProcessingFn,
} from "./utils";

/**
 * Web component for rendering the datacommons line tile.
 *
 * Example usage:
 *
 * <datacommons-line
 *      title="Population Below Poverty Level Status in Past Year in States of United States (2020)"
 *      place="country/USA"
 *      variables='["Count_Person_BelowPovertyLevelInThePast12Months"]'
 *    ></datacommons-line>
 */
@customElement("datacommons-line")
export class DatacommonsLineComponent extends LitElement {
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

  // Optional: colors to use
  // Length should match number of variables
  @property({ type: Array<string>, converter: convertArrayAttribute })
  colors?: string[];

  // Title of the chart
  @property()
  header!: string;

  /**
   * @deprecated
   * DCID of the place to plot
   */
  @property()
  place: string;

  // DCID of the parent place
  @property()
  parentPlace!: string;

  // Optional: DCIDs of specific places to plot
  // If provided, parentPlace and childPlaceType will be ignored
  @property({ type: Array<string>, converter: convertArrayAttribute })
  places!: string[];

  /**
   * @deprecated
   * Title of the chart
   */
  @property()
  title!: string;

  // Statistical variable DCIDs
  @property({ type: Array<string>, converter: convertArrayAttribute })
  variables!: Array<string>;

  // Optional: Regex used to process variable names
  // If provided, will only use the first case of the variable name that matches
  // this regex.
  // For example, if the variableNameRegex is "(.*?)(?=:)", only the part before
  // a ":" will be used for variable names. So "variable 1: test" will become
  // "variable 1".
  @property()
  variableNameRegex!: string;

  // Optional: default variable name used with variableNameRegex.
  // If provided and no variable name can be extracted using variableNameRegex,
  // use this as the variable name.
  @property()
  defaultVariableName!: string;

  // Optional: Property to use to get place names
  @property()
  placeNameProp: string;

  // Optional: List of variable DCIDs to plot per capita
  @property({ type: Array<string>, converter: convertArrayAttribute })
  perCapita?: string[];

  // Optional: Whether to show the "explore" link.
  // Default: false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showExploreMore: boolean;

  // Optional: Timescale to use for x-axis labels
  @property()
  timeScale?: TimeScaleOption;

  // Optional: Only show observations equal to or after this date.
  @property()
  startDate?: string;

  // Optional: Only show observations equal to or before this date.
  @property()
  endDate?: string;

  // Optional: List of sources for this component
  @property({ type: Array<string>, converter: convertArrayAttribute })
  sources?: string[];

  // Optional: Locale to use for this component
  @property()
  locale?: string;

  render(): HTMLDivElement {
    const lineTileProps: LineTilePropType = {
      apiRoot: getApiRoot(this.apiRoot),
      colors: this.colors,
      comparisonPlaces: this.places,
      enclosedPlaceType: this.childPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: this.parentPlace || this.place,
        name: "",
        types: [],
      },
      startDate: this.startDate,
      endDate: this.endDate,
      showExploreMore: this.showExploreMore,
      showTooltipOnHover: true,
      sources: this.sources,
      statVarSpec: this.variables.map((variable) => ({
        denom:
          this.perCapita && this.perCapita.includes(variable)
            ? DEFAULT_PER_CAPITA_DENOM
            : "",
        log: false,
        name: "",
        scaling: 1,
        statVar: variable,
        unit: "",
      })),
      svgChartHeight: 200,
      title: this.header || this.title,
      timeScale: this.timeScale,
      getProcessedSVNameFn: getVariableNameProcessingFn(
        this.variableNameRegex,
        this.defaultVariableName
      ),
      placeNameProp: this.placeNameProp,
    };
    return createWebComponentElement(LineTile, lineTileProps, this.locale);
  }
}
