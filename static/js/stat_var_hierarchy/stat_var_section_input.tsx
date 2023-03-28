/**
 * Copyright 2021 Google LLC
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

/**
 * Component for rendering a stat var section input (checkbox or radio button)
 * in the stat var hierarchy.
 */

import * as d3 from "d3";
import _ from "lodash";
import React from "react";

import { Context, ContextType } from "../shared/context";
import {
  RADIO_BUTTON_TYPES,
  StatVarHierarchyType,
  StatVarInfo,
  StatVarSummary,
} from "../shared/types";
import { ALL_MAP_PLACE_TYPES } from "../tools/map/util";
import { hideTooltip, showTooltip, SV_HIERARCHY_SECTION_ID } from "./util";

const TOOLTIP_TOP_OFFSET = 10;
const STATE_OR_EQUIVALENT = "State or equivalent";
const COUNTY_OR_EQUIVALENT = "County or equivalent";
const CITY_OR_EQUIVALENT = "City or equivalent";
// Some place types are considered equivalent so this maps a place type to the
// place type that we will display its information under.
const PLACE_TYPE_MAPPING = {
  EurostatNUTS1: STATE_OR_EQUIVALENT,
  EurostatNUTS2: STATE_OR_EQUIVALENT,
  State: STATE_OR_EQUIVALENT,
  AdministrativeArea1: STATE_OR_EQUIVALENT,
  EurostatNUTS3: COUNTY_OR_EQUIVALENT,
  AdministrativeArea2: COUNTY_OR_EQUIVALENT,
  County: COUNTY_OR_EQUIVALENT,
  Town: CITY_OR_EQUIVALENT,
  Village: CITY_OR_EQUIVALENT,
  Borough: CITY_OR_EQUIVALENT,
  City: CITY_OR_EQUIVALENT,
};
const ALLOWED_PLACE_TYPES = new Set([
  "Country",
  "State",
  "Province",
  "County",
  "City",
  "Town",
  "Village",
  "School",
  "Borough",
  "CensusZipCodeTabulationArea",
  "EurostatNUTS1",
  "EurostatNUTS2",
  "EurostatNUTS3",
  "AdministrativeArea1",
  "AdministrativeArea2",
  "AdministrativeArea3",
  "AdministrativeArea4",
  "AdministrativeArea5",
  "AdministrativeArea",
  "Neighborhood",
  "Place",
]);
const IGNORED_PLACE_DCIDS = new Set(["Earth"]);

interface StatVarSectionInputPropType {
  path: string[];
  statVar: StatVarInfo;
  selected: boolean;
  summary: StatVarSummary;
  // prefix of the display name that should be replaced with "…"
  prefixToReplace: string;
}

interface StatVarSectionInputStateType {
  checked: boolean;
}

export class StatVarSectionInput extends React.Component<
  StatVarSectionInputPropType,
  StatVarSectionInputStateType
> {
  context: ContextType;
  constructor(props: StatVarSectionInputPropType) {
    super(props);
    this.state = {
      checked: false,
    };
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentDidMount(): void {
    this.setState({
      checked: this.isChecked(),
    });
  }

  componentDidUpdate(prevProps: StatVarSectionInputPropType): void {
    if (this.props !== prevProps) {
      this.setState({
        checked: this.isChecked(),
      });
    }
  }

  private isChecked(): boolean {
    return this.props.statVar.id in this.context.svPath;
  }

  private handleInputChange(): void {
    this.context.togglePath(this.props.statVar.id, this.props.path);
    this.setState({
      checked: !this.state.checked,
    });
  }

  render(): JSX.Element {
    const inputType = RADIO_BUTTON_TYPES.has(this.context.statVarHierarchyType)
      ? "radio"
      : "checkbox";
    const sectionId = this.props.statVar.id + this.props.path.join("-");
    let className = "node-title";
    if (!this.props.statVar.hasData) {
      className = "node-title node-no-data";
    } else if (this.props.selected) {
      className = "node-title highlighted-node-title";
    }
    let displayName = this.props.statVar.displayName;
    // Only replace prefix in display name if prefix is shorter than display
    // name.
    if (
      !_.isEmpty(this.props.prefixToReplace) &&
      this.props.prefixToReplace.length < displayName.length
    ) {
      displayName = "…" + displayName.slice(this.props.prefixToReplace.length);
    }
    return (
      <form className={className}>
        <input
          id={sectionId}
          name="stat-var-hierarchy"
          type={inputType}
          checked={this.state.checked}
          onChange={this.handleInputChange}
          disabled={!this.props.statVar.hasData}
        />
        <label
          className={this.state.checked ? "selected-node-title" : ""}
          htmlFor={sectionId}
          onMouseMove={this.mouseMoveAction(this.props.statVar.hasData)}
          onMouseOut={() => hideTooltip()}
        >
          {displayName}
        </label>
      </form>
    );
  }

  /**
   * Gets the place types and example places available for the current stat var.
   * Returns a dictionary of place type to list of place names
   */
  private getAvailablePlaceTypesAndExamples(): Record<string, string[]> {
    const availablePlaceTypes = Object.keys(
      this.props.summary.placeTypeSummary
    ).filter((placeType) => {
      if (this.context.statVarHierarchyType === StatVarHierarchyType.MAP) {
        return placeType in ALL_MAP_PLACE_TYPES;
      }
      return ALLOWED_PLACE_TYPES.has(placeType);
    });
    // Some place types are considered equivalent, so need to consolidate the
    // information for equivalent place types.
    const placeTypeToPlaceNames = {};
    for (let placeType of availablePlaceTypes) {
      const placeSummary = this.props.summary.placeTypeSummary[placeType];
      const placeList = placeSummary.topPlaces.filter(
        (place) =>
          !_.isEmpty(place.name) && !IGNORED_PLACE_DCIDS.has(place.dcid)
      );
      if (_.isEmpty(placeList)) {
        continue;
      }
      const placeNames = placeList.map((place) => place.name);
      if (_.isEmpty(placeNames)) {
        continue;
      }
      placeType =
        placeType in PLACE_TYPE_MAPPING
          ? PLACE_TYPE_MAPPING[placeType]
          : placeType;
      if (placeType in placeTypeToPlaceNames) {
        placeTypeToPlaceNames[placeType].push(...placeNames);
      } else {
        placeTypeToPlaceNames[placeType] = placeNames;
      }
    }
    return placeTypeToPlaceNames;
  }

  /**
   * Returns the html content for the tooltip. The content can be an empty
   * string.
   */
  private getTooltipHtml(hasData: boolean): string {
    let html = `<b>${
      this.props.statVar.displayName || this.props.statVar.id
    }</b></br><span>dcid: ${this.props.statVar.id}</span></br>`;
    html += hasData
      ? ""
      : "This statistical variable has no data for any of the chosen places.";
    if (_.isEmpty(this.props.summary)) {
      return html;
    }
    const placeTypeToPlaceNames = this.getAvailablePlaceTypesAndExamples();
    if (_.isEmpty(placeTypeToPlaceNames)) {
      return hasData
        ? ""
        : "Sorry, this statistical variable is not supported by this tool.";
    } else {
      html += hasData
        ? "This statistical variable is available for these types of places:<ul>"
        : "You can try these types of places instead:<ul>";
    }
    for (const placeType in placeTypeToPlaceNames) {
      // We only want to show a unique list of 3 items as examples.
      const uniquePlaces = new Set(placeTypeToPlaceNames[placeType]);
      const placeList =
        uniquePlaces.size > 3
          ? Array.from(uniquePlaces).slice(0, 3)
          : Array.from(uniquePlaces);
      html +=
        this.context.statVarHierarchyType === StatVarHierarchyType.TIMELINE
          ? `<li>${placeType} (eg. ${placeList.join(", ")})</li>`
          : `<li>${placeType}</li>`;
    }
    html += "</ul>";
    return html;
  }

  private mouseMoveAction = (hasData: boolean) => (e) => {
    const html = this.getTooltipHtml(hasData);
    if (_.isEmpty(html)) {
      return;
    }
    const left = e.pageX;
    const containerY = (
      d3.select(`#${SV_HIERARCHY_SECTION_ID}`).node() as HTMLElement
    ).getBoundingClientRect().y;
    const top = e.pageY - containerY + TOOLTIP_TOP_OFFSET;
    showTooltip(html, { left, top });
  };
}

StatVarSectionInput.contextType = Context;
