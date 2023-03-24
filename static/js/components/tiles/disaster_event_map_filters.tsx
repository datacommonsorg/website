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

import { URL_HASH_PARAM_KEYS } from "../../constants/disaster_event_map_constants";
import { EventTypeSpec } from "../../types/subject_page_proto_types";
import {
  getSeverityFilters,
  setUrlHash,
} from "../../utils/disaster_event_map_utils";

const DELAY_MS = 700;

interface DisasterEventMapFiltersPropType {
  // map of disaster type to information about that event type
  eventTypeSpec: Record<string, EventTypeSpec>;
  // id of the block this component is in.
  blockId: string;
}

export function DisasterEventMapFilters(
  props: DisasterEventMapFiltersPropType
): JSX.Element {
  const delayTimer = useRef(null);
  const [severityFilterInputs, setSeverityFilterInputs] = useState(
    getSeverityFilters(props.eventTypeSpec, props.blockId)
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
      () =>
        setUrlHash(
          URL_HASH_PARAM_KEYS.SEVERITY_FILTER,
          JSON.stringify(updatedSeverityFilters),
          props.blockId
        ),
      DELAY_MS
    );
  }

  function updateFilterHash(): void {
    clearTimeout(delayTimer.current);
    setUrlHash(
      URL_HASH_PARAM_KEYS.SEVERITY_FILTER,
      JSON.stringify(severityFilterInputs),
      props.blockId
    );
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
                    onBlur={() => updateFilterHash()}
                    onKeyPress={(e) => e.key === "Enter" && updateFilterHash()}
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
                    onBlur={() => updateFilterHash()}
                    onKeyPress={(e) => e.key === "Enter" && updateFilterHash()}
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
