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
 * Component for the mapping section for the multiVarMultiDateCol template
 */

import _ from "lodash";
import React from "react";

import { MappingTemplateProps } from "../../templates";
import {
  Column,
  MAPPED_THING_NAMES,
  MappedThing,
  MappingType,
  MappingVal,
} from "../../types";
import { MappingColumnInput } from "../shared/mapping_column_input";
import { MappingHeaderInput } from "../shared/mapping_header_input";
import { MappingPlaceInput } from "../shared/mapping_place_input";

export function MultiVarMultiDateCol(props: MappingTemplateProps): JSX.Element {
  // Set of column indices that have been mapped.
  const mappedColumnIndices = new Set();
  props.userMapping &&
    props.userMapping.forEach((mappingVal) => {
      if (mappingVal.column) {
        mappedColumnIndices.add(mappingVal.column.columnIdx);
      }
      if (mappingVal.headers) {
        mappingVal.headers.forEach((col) => {
          if (col) {
            mappedColumnIndices.add(col.columnIdx);
          }
        });
      }
    });

  return (
    <div id="single-var-multi-date">
      <h3>Choose column titles containing data about these fields:</h3>
      <table className="table">
        <tbody>
          <tr>
            <td className="col-2">Variable*:</td>
            <td className="col-10">
              <MappingColumnInput
                mappingVal={props.userMapping.get(MappedThing.STAT_VAR)}
                onMappingValUpdate={(mappingVal) =>
                  props.onMappingValUpdated(MappedThing.STAT_VAR, mappingVal)
                }
                orderedColumns={props.csvData.orderedColumns}
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
            <td>Observation Value*:</td>
            <td>
              <MappingHeaderInput
                mappedThingName={
                  MAPPED_THING_NAMES[MappedThing.DATE] || MappedThing.DATE
                }
                mappingVal={props.userMapping.get(MappedThing.DATE)}
                onMappingValUpdate={(mappingVal: MappingVal) =>
                  props.onMappingValUpdated(MappedThing.DATE, mappingVal)
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
