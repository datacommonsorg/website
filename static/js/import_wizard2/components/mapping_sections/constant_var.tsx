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

import { MappingSectionProps } from "../../templates";
import { Column, MappedThing, MappingType, MappingVal } from "../../types";

export function ConstantVar(props: MappingSectionProps): JSX.Element {
  let [
    placeMapping,
    dateMapping,
    unitMapping,
    statVarMapping,
    valueMapping,
  ]: MappingVal[] = [];
  const userMapping = _.clone(props.predictedMapping);
  const mappedColumnIndices = new Set();

  props.predictedMapping &&
    props.predictedMapping.forEach((mappingVal, mappedThing) => {
      // Assume mappings are of type COLUMN for the template.
      switch (mappedThing) {
        case MappedThing.PLACE:
          placeMapping = mappingVal;
          mappedColumnIndices.add(mappingVal.column.columnIdx);
          break;
        case MappedThing.DATE:
          dateMapping = mappingVal;
          mappedColumnIndices.add(mappingVal.column.columnIdx);
          break;
        case MappedThing.UNIT:
          unitMapping = mappingVal;
          mappedColumnIndices.add(mappingVal.column.columnIdx);
          break;
        case MappedThing.VALUE:
          valueMapping = mappingVal;
          mappedColumnIndices.add(mappingVal.column.columnIdx);
        default:
          console.log(
            `Ignoring inferred mapping of type ${mappedThing}: ${mappingVal}`
          );
      }
    });

  function onStatVarUpdate(value: string) {
    // TODO: Add value validation
    statVarMapping = {
      type: MappingType.FILE_CONSTANT,
      fileConstant: value,
    };
    userMapping.set(MappedThing.STAT_VAR, statVarMapping);
    props.onChangeUserMapping(userMapping);
  }

  return (
    <div id="constant-var">
      <h3>Choose column titles containing data about these fields:</h3>
      <table className="table">
        <tbody>
          <tr>
            <td className="col-2">Variable*:</td>
            <td className="col-10">
              <Input
                className="constant-value-input"
                type="text"
                onChange={(e) => {
                  const val = e.target.value;
                  onStatVarUpdate(val);
                }}
                placeholder="Enter the variable for this dataset"
                value={statVarMapping && statVarMapping.fileConstant}
              />
            </td>
          </tr>
          <tr>
            <td>Place*:</td>
            <td>{placeMapping && placeMapping.column.header}</td>
          </tr>
          <tr>
            <td>Date*:</td>
            <td>{dateMapping && dateMapping.column.header}</td>
          </tr>
          <tr>
            <td>Observation Value*:</td>
            <td>{valueMapping && valueMapping.column.header}</td>
          </tr>
          <tr>
            <td>Unit:</td>
            <td>{unitMapping && unitMapping.column.header}</td>
          </tr>
          <tr>
            <td>Ignored columns:</td>
            <td>
              {props.csvData.orderedColumns.map((col: Column) => {
                if (mappedColumnIndices.has(col.columnIdx)) {
                  return <></>;
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
