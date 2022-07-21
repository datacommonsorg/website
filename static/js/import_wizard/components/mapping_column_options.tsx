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
 * Component for showing and updating options for a single column.
 */

import _ from "lodash";
import React from "react";
import { FormGroup, Input, Label } from "reactstrap";

import {
  DCProperty,
  MAPPED_THING_NAMES,
  MappedThing,
  MappingType,
} from "../types";
import { PlaceDetector } from "../utils/detect_place";
import { ColumnInfo } from "./mapping_section";

interface MappingColumnOptionsProps {
  column: ColumnInfo;
  onColumnUpdated: (column: ColumnInfo) => void;
  validPlaceTypeProperties: Record<string, Set<DCProperty>>;
  placeDetector: PlaceDetector;
}

const IGNORED_MAPPED_THINGS = new Set([MappedThing.UNIT]);
const NUM_EXAMPLES = 2;

export function MappingColumnOptions(
  props: MappingColumnOptionsProps
): JSX.Element {
  const validPlaceTypes = Object.keys(props.validPlaceTypeProperties);
  const validPlaceProperties = Array.from(
    props.validPlaceTypeProperties[props.column.columnPlaceType.dcid]
  );
  return (
    <div className="column-options">
      <div className="column-options-header">
        For the column <b>{props.column.column.header}</b>:
      </div>
      <FormGroup radio="true" className="column-options-input-section">
        {/* radio option for mapping type of HEADER */}
        <Label radio="true" className="column-options-input header-type">
          <Input
            type="radio"
            name="mapping-type"
            checked={props.column.type === MappingType.COLUMN_HEADER}
            onChange={() =>
              updateColumn(
                MappingType.COLUMN_HEADER,
                props.column.headerMappedThing
              )
            }
          />
          {
            <>
              <span>
                The column title {`(${props.column.column.header})`} is a
              </span>
              {/* drop down for selecting the mapped thing */}
              <Input
                id="header-type-mapped-thing"
                className="column-option-dropdown"
                type="select"
                value={props.column.headerMappedThing}
                onChange={(e) =>
                  updateColumn(
                    MappingType.COLUMN_HEADER,
                    e.target.value as MappedThing
                  )
                }
              >
                {Object.values(MappedThing)
                  .filter((thing) => !IGNORED_MAPPED_THINGS.has(thing))
                  .map((thing) => (
                    <option value={thing} key={thing}>
                      {MAPPED_THING_NAMES[thing] || thing}
                    </option>
                  ))}
              </Input>
            </>
          }
        </Label>
        {/* radio option for mapping type of COLUMN */}
        <Label radio="true" className="column-options-input column-type">
          <Input
            type="radio"
            name="mapping-type"
            checked={props.column.type === MappingType.COLUMN}
            onChange={() =>
              updateColumn(MappingType.COLUMN, props.column.columnMappedThing)
            }
          />
          <div className="column-type-inputs">
            Rows contain values for
            {/* drop down for selecting the mapped thing */}
            <Input
              id="column-type-mapped-thing"
              className="column-option-dropdown"
              type="select"
              value={props.column.columnMappedThing}
              onChange={(e) =>
                updateColumn(MappingType.COLUMN, e.target.value as MappedThing)
              }
            >
              {Object.values(MappedThing)
                .filter((thing) => !IGNORED_MAPPED_THINGS.has(thing))
                .map((thing) => (
                  <option value={thing} key={thing}>
                    {MAPPED_THING_NAMES[thing] || thing}
                  </option>
                ))}
            </Input>
            {props.column.columnMappedThing === MappedThing.PLACE && (
              <>
                of type
                {/* drop down for selecting the place type */}
                <Input
                  id="column-type-place-type"
                  className="column-option-dropdown"
                  type="select"
                  value={props.column.columnPlaceType.dcid}
                  onChange={(e) =>
                    updateColumn(
                      MappingType.COLUMN,
                      MappedThing.PLACE,
                      e.target.value
                    )
                  }
                >
                  {validPlaceTypes.map((type) => (
                    <option value={type} key={type}>
                      {props.placeDetector.placeTypes.get(type).displayName}
                    </option>
                  ))}
                </Input>
                and of format
                {/* drop down for selecting the place property */}
                <Input
                  id="column-type-place-property"
                  className="column-option-dropdown"
                  type="select"
                  value={props.column.columnPlaceProperty.dcid}
                  onChange={(e) =>
                    updateColumn(
                      MappingType.COLUMN,
                      MappedThing.PLACE,
                      undefined,
                      e.target.value
                    )
                  }
                >
                  {validPlaceProperties.map((property) => (
                    <option value={property.dcid} key={property.dcid}>
                      {property.displayName}
                    </option>
                  ))}
                </Input>
              </>
            )}
            {!_.isEmpty(props.column.sampleValues) && (
              <span>{`(eg. ${props.column.sampleValues
                .slice(0, NUM_EXAMPLES)
                .join(", ")})`}</span>
            )}
          </div>
        </Label>
        {/* radio option for NO MAPPING */}
        <Label radio="true" className="column-options-input no-type">
          <Input
            type="radio"
            name="mapping-type"
            checked={_.isEmpty(props.column.type)}
            onChange={() => updateColumn(null, null)}
          />
          Skip this column
        </Label>
      </FormGroup>
    </div>
  );

  function updateColumn(
    mappingType: MappingType,
    mappedThing: MappedThing,
    columnPlaceType?: string,
    columnPlaceProperty?: string
  ): void {
    const updatedColumn: ColumnInfo = _.cloneDeep(props.column);
    updatedColumn.type = mappingType;
    updatedColumn.mappedThing = mappedThing;
    if (mappingType === MappingType.COLUMN) {
      updatedColumn.columnMappedThing = mappedThing;
      // if columnPlaceType is updated, updated columnPlaceType and
      // columnPlaceProperty
      if (!_.isEmpty(columnPlaceType)) {
        updatedColumn.columnPlaceType =
          props.placeDetector.placeTypes.get(columnPlaceType);
        const possibleProperties =
          props.validPlaceTypeProperties[columnPlaceType] || new Set();
        updatedColumn.columnPlaceProperty = possibleProperties.has(
          updatedColumn.columnPlaceProperty
        )
          ? updatedColumn.columnPlaceProperty
          : Array.from(possibleProperties)[0];
      }
      // if columnPlaceProperty is updated, update columnPlaceProperty
      if (!_.isEmpty(columnPlaceProperty)) {
        updatedColumn.columnPlaceProperty =
          props.placeDetector.placeProperties.get(columnPlaceProperty);
      }
    }
    if (mappingType === MappingType.COLUMN_HEADER) {
      updatedColumn.headerMappedThing = mappedThing;
    }
    props.onColumnUpdated(updatedColumn);
  }
}
