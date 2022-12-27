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
import React from "react";
import { Input } from "reactstrap";

import { SeverityFilter } from "../../types/disaster_event_map_types";
import { EventTypeSpec } from "../../types/subject_page_proto_types";

interface DisasterEventMapFiltersPropType {
  // map of disaster type to map of severity prop to filter for that prop
  severityFilters: Record<string, Record<string, SeverityFilter>>;
  // map of disaster type to information about that event type
  eventTypeSpec: Record<string, EventTypeSpec>;
  // callback function when severity filters are updated.
  onSeverityFiltersUpdated: (
    severityFilters: Record<string, Record<string, SeverityFilter>>
  ) => void;
  // height to set this component to.
  height: number;
}

export function DisasterEventMapFilters(
  props: DisasterEventMapFiltersPropType
): JSX.Element {
  function onFilterInputChanged(
    disasterType: string,
    prop: string,
    newVal: number
  ): void {
    const updatedSeverityFilters = _.cloneDeep(props.severityFilters);
    updatedSeverityFilters[disasterType][prop].min = newVal;
    props.onSeverityFiltersUpdated(updatedSeverityFilters);
  }

  return (
    <div
      className={"disaster-event-map-severity-filters"}
      style={props.height ? { height: props.height } : {}}
    >
      <h6>Severity Filters</h6>
      {Object.keys(props.severityFilters).map((disasterType) => {
        const disasterTypeName = props.eventTypeSpec[disasterType].name;
        return (
          <div
            className="disaster-type-filters"
            key={`${disasterType}-filters`}
          >
            <div className="disaster-type-name">{disasterTypeName}</div>
            {Object.keys(props.severityFilters[disasterType]).map((prop) => {
              return (
                <div
                  className="prop-filter"
                  key={`${disasterType}-${prop}-filter`}
                >
                  <span>{prop}</span>
                  <div className="prop-filter-input">
                    <span>min: </span>
                    <Input
                      type="number"
                      onChange={(e) =>
                        onFilterInputChanged(
                          disasterType,
                          prop,
                          Number(e.target.value)
                        )
                      }
                      value={props.severityFilters[disasterType][prop].min}
                    />
                  </div>
                  <div className="prop-filter-input">
                    <span>max: </span>
                    <Input
                      type="number"
                      onChange={(e) =>
                        onFilterInputChanged(
                          disasterType,
                          prop,
                          Number(e.target.value)
                        )
                      }
                      value={props.severityFilters[disasterType][prop].max}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
