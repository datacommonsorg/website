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
 * Component for inputting the mapping value of type COLUMN_HEADER
 */

import _ from "lodash";
import React from "react";
import { Input } from "reactstrap";

import { Column, MappingType, MappingVal } from "../../types";

interface MappingHeaderInputPropType {
  mappedThingName: string;
  mappingVal: MappingVal;
  onMappingValUpdate: (mappingVal: MappingVal) => void;
  orderedColumns: Array<Column>;
}

export function MappingHeaderInput(
  props: MappingHeaderInputPropType
): JSX.Element {
  // handles when column selection changes for one of the header columns
  function onColumnSelectionChange(selection: string, headerIdx: number): void {
    const updatedMappingVal = props.mappingVal
      ? _.cloneDeep(props.mappingVal)
      : { type: MappingType.COLUMN_HEADER, headers: [] };
    const column =
      selection === "" ? null : props.orderedColumns[Number(selection)];
    while (headerIdx >= updatedMappingVal.headers.length) {
      updatedMappingVal.headers.push(null);
    }
    updatedMappingVal.headers[headerIdx] = column;
    props.onMappingValUpdate(updatedMappingVal);
  }

  // handles when the name to use changes for one of the header columns
  function onHeaderNameChange(name: string, headerIdx: number): void {
    const updatedMappingVal = props.mappingVal
      ? _.cloneDeep(props.mappingVal)
      : { type: MappingType.COLUMN_HEADER, headers: [] };
    if (
      headerIdx < updatedMappingVal.headers.length &&
      updatedMappingVal.headers[headerIdx]
    ) {
      updatedMappingVal.headers[headerIdx].header = name;
    }
    props.onMappingValUpdate(updatedMappingVal);
  }

  const headers =
    props.mappingVal && props.mappingVal.headers
      ? props.mappingVal.headers
      : [null];

  return (
    <div className="mapping-headers">
      {headers.map((col, idx) => {
        return (
          <div className="header-item" key={"header-item-" + idx}>
            <div className="header-item-input-section">
              <div className="header-input-subitem">
                <span>Values*:</span>
                <Input
                  className="column-option-dropdown"
                  type="select"
                  value={col ? col.columnIdx : ""}
                  onChange={(e) => onColumnSelectionChange(e.target.value, idx)}
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
              </div>
              <div className="header-input-subitem">
                <span>{props.mappedThingName}*: </span>
                <Input
                  className="column-header-value"
                  type="text"
                  onChange={(e) => {
                    onHeaderNameChange(e.target.value, idx);
                  }}
                  placeholder=""
                  value={col ? col.header : ""}
                  disabled={_.isEmpty(col)}
                />
              </div>
            </div>
            {headers.length > 1 && (
              <span
                onClick={() => {
                  const updatedMappingVal = _.cloneDeep(props.mappingVal);
                  updatedMappingVal.headers.splice(idx, 1);
                  props.onMappingValUpdate(updatedMappingVal);
                }}
                className="material-icons-outlined"
                title="Remove mapping"
              >
                delete
              </span>
            )}
          </div>
        );
      })}
      <div
        onClick={() => {
          onColumnSelectionChange("", headers.length);
        }}
        className="mapping-header-input-add"
      >
        + Add mapping
      </div>
    </div>
  );
}
