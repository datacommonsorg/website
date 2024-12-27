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
 * Component for rendering the filters for a disaster event map.
 */

import _ from "lodash";
import React, { useRef, useState } from "react";
import { Input } from "reactstrap";

import {
  EventTypeSpec,
  SeverityFilter,
} from "../../types/subject_page_proto_types";

const DELAY_MS = 700;

interface DisasterEventMapFiltersPropType {
  // map of disaster type to information about that event type
  eventTypeSpec: Record<string, EventTypeSpec>;
  // id of the block this component is in.
  blockId: string;
  // severity filters
  severityFilters: Record<string, SeverityFilter>;
  // function to run to set severity filters
  setSeverityFilters: (filters: Record<string, SeverityFilter>) => void;
}

export function DisasterEventMapFilters(
  props: DisasterEventMapFiltersPropType
): JSX.Element {
  const delayTimer = useRef(null);
  const [severityFilterInputs, setSeverityFilterInputs] = useState(
    props.severityFilters
  );

  function onFilterInputChanged(
    disasterType: string,
    newVal: number,
    isUpperLimit: boolean
  ): void {
    // TODO (chejennifer): putting the entire severity filter into the url
    // makes a very long hash. Find a better way to save filter information
    // in the url.
    const updatedSeverityFilters = _.cloneDeep(severityFilterInputs);
    if (isUpperLimit) {
      updatedSeverityFilters[disasterType].upperLimit = newVal;
    } else {
      updatedSeverityFilters[disasterType].lowerLimit = newVal;
    }
    setSeverityFilterInputs(updatedSeverityFilters);
    clearTimeout(delayTimer.current);
    delayTimer.current = setTimeout(
      () => props.setSeverityFilters(updatedSeverityFilters),
      DELAY_MS
    );
  }

  function updateFilter(): void {
    clearTimeout(delayTimer.current);
    props.setSeverityFilters(severityFilterInputs);
  }

  return (
    <div className={"disaster-event-map-severity-filters"}>
      <h3>Filters</h3>
      <div className="row">
        {Object.keys(severityFilterInputs).map((disasterType) => {
          const disasterTypeName = props.eventTypeSpec[disasterType].name;
          const severityFilter = severityFilterInputs[disasterType];
          return (
            <div
              className="disaster-type-filters col"
              key={`${disasterType}-filters`}
            >
              <div className="disaster-type-name">
                {disasterTypeName} ({severityFilter.prop})
              </div>
              <div
                className="prop-filter"
                key={`${disasterType}-${severityFilter.prop}-filter`}
              >
                <div className="prop-filter-input">
                  <span>min: </span>
                  <Input
                    type="number"
                    onChange={(e) =>
                      onFilterInputChanged(
                        disasterType,
                        Number(e.target.value),
                        false /* isUpperLimit */
                      )
                    }
                    value={severityFilter.lowerLimit}
                    onBlur={() => updateFilter()}
                    onKeyPress={(e) => e.key === "Enter" && updateFilter()}
                  />
                </div>
                <div className="prop-filter-input">
                  <span>max: </span>
                  <Input
                    type="number"
                    onChange={(e) =>
                      onFilterInputChanged(
                        disasterType,
                        Number(e.target.value),
                        true /* isUpperLimit */
                      )
                    }
                    value={severityFilter.upperLimit}
                    onBlur={() => updateFilter()}
                    onKeyPress={(e) => e.key === "Enter" && updateFilter()}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
