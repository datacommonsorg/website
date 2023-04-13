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

/**
 * Component for inputting a constant for the file mapping
 */

import _ from "lodash";
import React from "react";
import { Input } from "reactstrap";

import {
  MAPPED_THING_NAMES,
  MappedThing,
  MappingType,
  MappingVal,
} from "../../types";

interface MappingConstantInputPropType {
  mappedThing: MappedThing;
  mappingVal: MappingVal;
  onMappingValUpdate: (mappingVal: MappingVal) => void;
  isRequired: boolean;
}

export function MappingConstantInput(
  props: MappingConstantInputPropType
): JSX.Element {
  const mappedThingString =
    MAPPED_THING_NAMES[props.mappedThing] || props.mappedThing;
  const label = `${
    props.isRequired ? "* " : ""
  }What is the ${mappedThingString.toLowerCase()} for this dataset?`;
  return (
    <div className="mapping-input-section">
      <div className="mapping-input-label">{label}</div>
      <Input
        className="constant-value-input"
        type="text"
        onChange={(e) => {
          const fileConstant = e.target.value;
          const mappingVal = {
            type: MappingType.FILE_CONSTANT,
            fileConstant,
          };
          props.onMappingValUpdate(mappingVal);
        }}
        placeholder="Enter the variable for this dataset"
        value={props.mappingVal ? props.mappingVal.fileConstant || "" : ""}
      />
    </div>
  );
}
