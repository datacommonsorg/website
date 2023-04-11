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

import _ from "lodash";
import React from "react";
import { Input } from "reactstrap";

import { MappingTemplateProps } from "../../templates";
import { Column, MappedThing, MappingType, MappingVal } from "../../types";
import { MappingColumnInput } from "../shared/mapping_column_input";
import { MappingPlaceInput } from "../shared/mapping_place_input";

export function ConstantVar(props: MappingTemplateProps): JSX.Element {
  const mappedColumnIndices = new Set();
  props.userMapping &&
    props.userMapping.forEach((mappingVal) => {
      if (mappingVal.column) {
        mappedColumnIndices.add(mappingVal.column.columnIdx);
      }
    });

  return (
    <div id="constant-var">
      <table className="table">
        <tbody>
          <tr>
            <td className="col-2">Variable*:</td>
            <td className="col-10">
              <Input
                className="constant-value-input"
                type="text"
                onChange={(e) => {
                  const fileConstant = e.target.value;
                  const mappingVal = {
                    type: MappingType.FILE_CONSTANT,
                    fileConstant,
                  };
                  props.onMappingValUpdated(MappedThing.STAT_VAR, mappingVal);
                }}
                placeholder="Enter the variable for this dataset"
                value={
                  props.userMapping.has(MappedThing.STAT_VAR)
                    ? props.userMapping.get(MappedThing.STAT_VAR).fileConstant
                    : ""
                }
              />
            </td>
          </tr>
          <tr>
            <td>Place*:</td>
            <td>
              <MappingPlaceInput
                mappingType={MappingType.COLUMN}
                mappingVal={props.userMapping.get(MappedThing.PLACE)}
                onMappingValUpdate={(mappingVal: MappingVal) =>
                  props.onMappingValUpdated(MappedThing.PLACE, mappingVal)
                }
                orderedColumns={props.csvData.orderedColumns}
              />
            </td>
          </tr>
          <tr>
            <td>Date*:</td>
            <td>
              <MappingColumnInput
                mappingVal={props.userMapping.get(MappedThing.DATE)}
                onMappingValUpdate={(mappingVal) =>
                  props.onMappingValUpdated(MappedThing.DATE, mappingVal)
                }
                orderedColumns={props.csvData.orderedColumns}
              />
            </td>
          </tr>
          <tr>
            <td>Observation Value*:</td>
            <td>
              <MappingColumnInput
                mappingVal={props.userMapping.get(MappedThing.VALUE)}
                onMappingValUpdate={(mappingVal) =>
                  props.onMappingValUpdated(MappedThing.VALUE, mappingVal)
                }
                orderedColumns={props.csvData.orderedColumns}
              />
            </td>
          </tr>
          <tr>
            <td>Unit:</td>
            <td>
              <MappingColumnInput
                mappingVal={props.userMapping.get(MappedThing.UNIT)}
                onMappingValUpdate={(mappingVal) =>
                  props.onMappingValUpdated(MappedThing.UNIT, mappingVal)
                }
                orderedColumns={props.csvData.orderedColumns}
              />
            </td>
          </tr>
          <tr>
            <td>Ignored columns:</td>
            <td>
              {props.csvData.orderedColumns.map((col: Column) => {
                if (mappedColumnIndices.has(col.columnIdx)) {
                  return "";
                }
                return col.header;
              })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
