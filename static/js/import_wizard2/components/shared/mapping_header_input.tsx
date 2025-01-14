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
  onMappingValUpdate: (mappingVal: MappingVal, hasInputErrors: boolean) => void;
  orderedColumns: Array<Column>;
  isValidHeader: (header: string) => boolean;
  invalidHeaderMsg: string;
}

export function MappingHeaderInput(
  props: MappingHeaderInputPropType
): JSX.Element {
  // Handles when mapping value is updated
  function onMappingValUpdate(mappingVal: MappingVal): void {
    // Check if the mapping val has any header errors
    const hasHeaderError =
      mappingVal.headers &&
      mappingVal.headers.findIndex(
        (header) => header && !props.isValidHeader(header.header)
      ) >= 0;
    props.onMappingValUpdate(mappingVal, hasHeaderError);
  }

  // Handles when column selection changes for one of the header columns
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
    onMappingValUpdate(updatedMappingVal);
  }

  // Handles when the name to use changes for one of the header columns
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
    onMappingValUpdate(updatedMappingVal);
  }

  const headers =
    props.mappingVal && props.mappingVal.headers
      ? props.mappingVal.headers
      : [null];
  const label = `Observation Value Columns*`;
  return (
    <div className="mapping-input-section">
      <div className="mapping-input-label">{label}</div>
      <div className="mapping-headers">
        {headers.map((col, idx) => {
          const hasHeaderError = col && !props.isValidHeader(col.header);
          return (
            <div className="header-item" key={"header-item-" + idx}>
              <div className="header-item-input-section">
                <div className="header-input-subitem">
                  <span className="header-input-label">Values*:</span>
                  <div className="header-input-subitem-input">
                    <Input
                      className="column-option-dropdown"
                      type="select"
                      value={col ? col.columnIdx : ""}
                      onChange={(e): void =>
                        onColumnSelectionChange(e.target.value, idx)
                      }
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
                </div>
                <div className="header-input-subitem">
                  <span className="header-input-label">
                    {props.mappedThingName}*:{" "}
                  </span>
                  <div className="header-input-subitem-input">
                    <Input
                      className={`column-header-value${
                        hasHeaderError ? "-error" : ""
                      }`}
                      type="text"
                      onChange={(e): void => {
                        onHeaderNameChange(e.target.value, idx);
                      }}
                      placeholder=""
                      value={col ? col.header : ""}
                      disabled={_.isEmpty(col)}
                    />
                    {hasHeaderError && (
                      <span className="error-message">
                        {props.invalidHeaderMsg}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {headers.length > 1 && (
                <span
                  onClick={(): void => {
                    const updatedMappingVal = _.cloneDeep(props.mappingVal);
                    updatedMappingVal.headers.splice(idx, 1);
                    onMappingValUpdate(updatedMappingVal);
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
          onClick={(): void => {
            onColumnSelectionChange("", headers.length);
          }}
          className="mapping-header-input-add"
        >
          + Add mapping
        </div>
      </div>
    </div>
  );
}
