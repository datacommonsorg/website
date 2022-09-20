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
 * Component for selecting a column mapping
 */

import _ from "lodash";
import React from "react";
import { Input } from "reactstrap";

import { Column, MappingType, MappingVal } from "../../types";

interface MappingColumnInputProps {
  mappingVal: MappingVal;
  onMappingValUpdate: (mappingVal: MappingVal) => void;
  orderedColumns: Array<Column>;
}

export function MappingColumnInput(
  props: MappingColumnInputProps
): JSX.Element {
  function onSelectionChange(selection: string): void {
    if (selection === "") {
      props.onMappingValUpdate(null);
    } else {
      const column = props.orderedColumns[Number(selection)];
      props.onMappingValUpdate({
        type: MappingType.COLUMN,
        column,
      });
    }
  }

  return (
    <Input
      className="column-option-dropdown"
      type="select"
      value={
        !_.isEmpty(props.mappingVal) && !_.isEmpty(props.mappingVal.column)
          ? props.mappingVal.column.columnIdx
          : ""
      }
      onChange={(e) => onSelectionChange(e.target.value)}
    >
      <option value="" key="">
        Select a column title
      </option>
      {props.orderedColumns.map((column, i) => (
        <option value={i} key={column.id}>
          Column: &ldquo;{column.header}&rdquo;
        </option>
      ))}
    </Input>
  );
}
