/**
 * Copyright 2022 Google LLC
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
 * Component for rendering the selectors section for a disaster event map tile.
 */

import React from "react";
import { CustomInput } from "reactstrap";

import { NamedTypedPlace } from "../../shared/types";

interface DisasterEventMapSelectorsPropType {
  // List of places to show in the breadcrumbs
  breadcrumbPlaces: NamedTypedPlace[];
  // Selected date
  selectedDate: string;
  // List of available date options
  dateList: string[];
  // Callback when new place is selected
  onPlaceSelected: (place: NamedTypedPlace) => void;
  // Callback when new date is selected
  onDateSelected: (date: string) => void;
}

export function DisasterEventMapSelectors(
  props: DisasterEventMapSelectorsPropType
): JSX.Element {
  return (
    <div className="disaster-event-map-selectors-section">
      <div className="disaster-event-map-breadcrumbs">
        {props.breadcrumbPlaces.map((crumb, i) => {
          return (
            <div
              key={crumb.dcid}
              className={`disaster-event-map-breadcrumb-entry${
                i === props.breadcrumbPlaces.length - 1 ? "-selected" : ""
              }`}
              onClick={() => props.onPlaceSelected(crumb)}
            >
              <span>{crumb.name}</span>
              {i < props.breadcrumbPlaces.length - 1 && (
                <i className="material-icons">chevron_right</i>
              )}
            </div>
          );
        })}
      </div>
      <div className="disaster-event-map-date-selector">
        Date:
        <CustomInput
          id="disaster-event-map-date-selector-input"
          type="select"
          value={props.selectedDate}
          onChange={(e) => {
            props.onDateSelected(e.target.value);
          }}
        >
          {props.dateList.map((date) => {
            return (
              <option value={date} key={date}>
                {date}
              </option>
            );
          })}
        </CustomInput>
      </div>
    </div>
  );
}
