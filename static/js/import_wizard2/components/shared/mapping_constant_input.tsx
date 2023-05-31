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
  onMappingValUpdate: (mappingVal: MappingVal, hasInputError: boolean) => void;
  isRequired: boolean;
  isValidValue: (value: string) => boolean;
  invalidValueMsg: string;
}

export function MappingConstantInput(
  props: MappingConstantInputPropType
): JSX.Element {
  const mappedThingString =
    MAPPED_THING_NAMES[props.mappedThing] || props.mappedThing;
  const label = `${mappedThingString}${props.isRequired ? "* " : ""}`;
  const placeholder = `Enter the ${mappedThingString.toLowerCase()}`;
  const isInvalidInput =
    props.mappingVal &&
    props.mappingVal.fileConstant &&
    !props.isValidValue(props.mappingVal.fileConstant);

  return (
    <div className="mapping-input-section mapping-constant-input">
      <div className="mapping-input-label">{label}</div>
      <div className="mapping-input-form">
        <Input
          className={`constant-value-input${isInvalidInput ? "-error" : ""}`}
          type="text"
          onChange={(e) => {
            const fileConstant = e.target.value;
            const mappingVal = {
              type: MappingType.FILE_CONSTANT,
              fileConstant,
            };
            props.onMappingValUpdate(
              mappingVal,
              fileConstant && !props.isValidValue(fileConstant)
            );
          }}
          placeholder={placeholder}
          value={props.mappingVal ? props.mappingVal.fileConstant || "" : ""}
        />
        {isInvalidInput && (
          <span className="error-message">{props.invalidValueMsg}</span>
        )}
      </div>
    </div>
  );
}
