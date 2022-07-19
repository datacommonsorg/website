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
 * Component for showing and updating constant values.
 */

import React from "react";
import { Input } from "reactstrap";

interface MappingConstantsSectionProps {
  constantVals: Record<string, string>;
  onConstantValUpdated: (thing: string, val: string) => void;
}

export function MappingConstantsSection(
  props: MappingConstantsSectionProps
): JSX.Element {
  return (
    <div className="section-container constant-values-section">
      <span>
        Required mappings are missing for the following things. Please update
        the column mappings or enter a constant value.
      </span>
      {Object.entries(props.constantVals).map(([thing, val]) => (
        <div
          className="constant-value-input-container"
          key={`constant-value-input-${thing}`}
        >
          <div className="constant-value-label">{thing}:</div>
          <Input
            className="constant-value-input"
            type="text"
            onChange={(e) => {
              const val = e.target.value;
              props.onConstantValUpdated(thing, val);
            }}
            value={val}
          />
        </div>
      ))}
    </div>
  );
}
