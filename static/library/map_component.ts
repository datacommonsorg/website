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

import { MapTile, MapTilePropType } from "../js/components/tiles/map_tile";
import { ContainedInPlaceSingleVariableDataSpec } from "../js/components/tiles/tile_types";
import { DEFAULT_PER_CAPITA_DENOM } from "./constants";
import {
  convertArrayAttribute,
  convertBooleanAttribute,
  createWebComponentElement,
  getApiRoot,
} from "./utils";

/**
 * Web component for rendering map tile.
 *
 * Example usage:
 *
 * <datacommons-map
 *      title="Population Below Poverty Level Status in Past Year in States of United States (2020)"
 *      parentPlace="country/USA"
 *      childPlaceType="State"
 *      variable="Count_Person_BelowPovertyLevelInThePast12Months"
 *    ></datacommons-map>
 */
@customElement("datacommons-map")
export class DatacommonsMapComponent extends LitElement {
  // Inject tiles.scss styles directly into web component
  static styles: CSSResult = css`
    ${unsafeCSS(tilesCssString)}
  `;

  // Optional: Allow zoom and pan on map
  @property({ type: Boolean })
  allowZoom: boolean;

  // Optional: API root to use to fetch data
  // Defaults to https://datacommons.org
  @property()
  apiRoot: string;

  // Type of child place to rank (ex: State, County)
  @property()
  childPlaceType!: string;

  // [Optional] List of type of child place to rank (ex: State, County),
  // in matching order with parentPlaces (plural). If fewer childPlaceTypes than
  // parentPlaces are provided, the last childPlaceType will be used for the
  // remaining parentPlaces. If provided, childPlaceType (singular) is ignored.
  @property({ type: Array<string>, converter: convertArrayAttribute })
  childPlaceTypes?: string[];

  // Optional: color(s) to use
  @property({ type: Array<string>, converter: convertArrayAttribute })
  colors?: string[];

  // Optional: specific date to show data for
  @property()
  date: string;

  // Optional: dates to fetch stat vars for, in matching order with
  //           variables (plural).
  @property({ type: Array<string>, converter: convertArrayAttribute })
  dates?: string[];

  // Title of the chart
  @property()
  header!: string;

  // DCID of the parent place
  @property()
  parentPlace!: string;

  // Optional: DCIDs of places to plot. If provided, childPlaceTypes
  // (plural) must also be provided, and parentPlace (singular) is ignored.
  @property({ type: Array<string>, converter: convertArrayAttribute })
  parentPlaces?: string[];

  /**
   * @deprecated
   * DCID of the parent place
   * Deprecated. Use parentPlace instead.
   */
  @property()
  place!: string;

  // Optional: listen for value changes with this event name
  @property()
  subscribe: string;

  /**
   * @deprecated
   * Title of the chart
   */
  @property()
  title!: string;

  // Statistical variable DCID
  @property()
  variable!: string;

  // Optional: DCIDs of variables. If provided, parentPlaces (plural) and
  // childPlaceTypes (plural) must also be provided, and variable (singular)
  // is ignored.  If fewer variables than parentPlaces are provided, the last
  // variable will be used for the remaining parentPlaces.
  @property({ type: Array<string>, converter: convertArrayAttribute })
  variables?: string[];

  /**
   * @deprecated
   * DCID of the parent place
   * Deprecated. Use parentPlace instead.
   */
  @property()
  placeDcid: string;

  /**
   * @deprecated
   * Type of child place to rank (ex: State, County)
   * Deprecated. Use childPlaceType instead.
   */
  @property()
  enclosedPlaceType: string;

  /**
   * @deprecated
   * Statistical variable DCID
   * Deprecated. Use variable instead.
   */
  @property()
  statVarDcid: string;

  // Optional: Whether to show the "explore" link.
  // Default: false
  @property({ type: Boolean, converter: convertBooleanAttribute })
  showExploreMore: boolean;

  // Optional: Property to use to get place names
  @property()
  placeNameProp: string;

  // Optional: List of variable DCIDs to plot per capita
  @property({ type: Array<string>, converter: convertArrayAttribute })
  perCapita?: string[];

  // Optional: Property to use to get geojsons
  @property()
  geoJsonProp: string;

  // Optional: List of sources for this component
  @property({ type: Array<string>, converter: convertArrayAttribute })
  sources?: string[];

  // Optional: Locale to use for this component
  @property()
  locale?: string;

  render(): HTMLDivElement {
    let dataSpecs: ContainedInPlaceSingleVariableDataSpec[] = [];
    if (!_.isEmpty(this.parentPlaces) && !_.isEmpty(this.childPlaceTypes)) {
      this.parentPlaces.forEach((placeDcid, index) => {
        const date = !_.isEmpty(this.dates)
          ? this.dates[Math.min(index, this.dates.length - 1)]
          : this.date;
        // If more parentPlaces than childPlaceTypes provided, use the
        // last childPlaceType provided for remaining parentPlaces.
        const enclosedPlaceType = !_.isEmpty(this.childPlaceTypes)
          ? this.childPlaceTypes[
              Math.min(index, this.childPlaceTypes.length - 1)
            ]
          : this.childPlaceType;
        // If more parentPlaces than variables provided, use the last
        // variable provided for remaining parentPlaces.
        const variable = !_.isEmpty(this.variables)
          ? this.variables[Math.min(index, this.variables.length - 1)]
          : this.variable || this.statVarDcid;
        dataSpecs.push({
          enclosedPlaceType,
          parentPlace: placeDcid,
          variable: {
            date,
            denom:
              this.perCapita && this.perCapita.includes(variable)
                ? DEFAULT_PER_CAPITA_DENOM
                : "",
            log: false,
            name: "",
            scaling: 1,
            statVar: variable,
            unit: "",
          },
        });
      });
    } else {
      const place = this.parentPlace || this.place || this.placeDcid;
      const variable = this.variable || this.statVarDcid;
      const childPlaceType = this.childPlaceType || this.enclosedPlaceType;
      dataSpecs = [
        {
          enclosedPlaceType: childPlaceType,
          parentPlace: place,
          variable: {
            denom:
              this.perCapita && this.perCapita.includes(variable)
                ? DEFAULT_PER_CAPITA_DENOM
                : "",
            log: false,
            name: "",
            scaling: 1,
            statVar: variable,
            unit: "",
            date: this.date,
          },
        },
      ];
    }

    // TODO: Remove placeholder values once Map Tile depreciates
    //       enclosedPlaceType, place, statVarSpec.
    const mapTileProps: MapTilePropType = {
      allowZoom: this.allowZoom,
      apiRoot: getApiRoot(this.apiRoot),
      colors: this.colors,
      dataSpecs,
      enclosedPlaceType: "", //childPlaceType,
      id: `chart-${_.uniqueId()}`,
      place: {
        dcid: "", //place,
        name: "",
        types: [],
      },
      showExploreMore: this.showExploreMore,
      sources: this.sources,
      statVarSpec: {
        denom: "",
        log: false,
        name: "",
        scaling: 1,
        statVar: "", //variable,
        unit: "",
        date: this.date,
      },
      svgChartHeight: 200,
      title: this.header || this.title,
      placeNameProp: this.placeNameProp,
      geoJsonProp: this.geoJsonProp,
      subscribe: this.subscribe,
    };
    return createWebComponentElement(MapTile, mapTileProps, this.locale);
  }
}
