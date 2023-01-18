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

import {
  DATE_OPTION_1Y_KEY,
  DATE_OPTION_6M_KEY,
  DATE_OPTION_30D_KEY,
  URL_HASH_PARAM_KEYS,
} from "../../constants/disaster_event_map_constants";
import { NamedPlace } from "../../shared/types";
import { getDate, setUrlHash } from "../../utils/disaster_event_map_utils";

const DATE_OPTION_DISPLAY_NAMES = {
  [DATE_OPTION_30D_KEY]: "Last 30 days",
  [DATE_OPTION_6M_KEY]: "Last 6 months",
  [DATE_OPTION_1Y_KEY]: "Last year",
};

interface DisasterEventMapSelectorsPropType {
  // List of available date options
  dateOptions: string[];
  // Callback when new place is selected
  onPlaceSelected: (place: NamedPlace) => void;
}

export function DisasterEventMapSelectors(
  props: DisasterEventMapSelectorsPropType
): JSX.Element {
  return (
    <div className="disaster-event-map-selectors-section">
      <div className="disaster-event-map-date-selector">
        Date:
        <CustomInput
          id="disaster-event-map-date-selector-input"
          type="select"
          value={getDate()}
          onChange={(e) => {
            setUrlHash(URL_HASH_PARAM_KEYS.DATE, e.target.value);
          }}
        >
          {props.dateOptions.map((date) => {
            return (
              <option value={date} key={date}>
                {DATE_OPTION_DISPLAY_NAMES[date] || date}
              </option>
            );
          })}
        </CustomInput>
      </div>
    </div>
  );
}
