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
import React, { useEffect, useState } from "react";
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
  const [unitInput, setUnitInput] = useState(
    props.column.constants.get(MappedThing.UNIT) || ""
  );

  useEffect(() => {
    setUnitInput(props.column.constants.get(MappedThing.UNIT) || "");
  }, [props.column]);

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
            onChange={(): void =>
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
                onChange={(e): void =>
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
              {props.column.headerMappedThing === MappedThing.PLACE &&
                getPlaceTypePropertyInputs(MappingType.COLUMN_HEADER)}
            </>
          }
        </Label>
        {/* radio option for mapping type of COLUMN */}
        <Label radio="true" className="column-options-input column-type">
          <Input
            type="radio"
            name="mapping-type"
            checked={props.column.type === MappingType.COLUMN}
            onChange={(): void =>
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
              onChange={(e): void =>
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
            {props.column.columnMappedThing === MappedThing.PLACE &&
              getPlaceTypePropertyInputs(MappingType.COLUMN)}
            {!_.isEmpty(props.column.sampleValues) && (
              <span>{`(e.g., ${props.column.sampleValues
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
            onChange={(): void => updateColumn(null, null)}
          />
          Skip this column
        </Label>
      </FormGroup>
      <div className="unit-input">
        If the values in this column have an associated unit, enter it here:
        <form
          onSubmit={(event): void => {
            event.preventDefault();
            updateColumnUnit();
          }}
        >
          <Input
            className="constant-value-input"
            type="text"
            onChange={(e): void => {
              const val = e.target.value;
              setUnitInput(val);
            }}
            onBlur={updateColumnUnit}
            value={unitInput}
          />
        </form>
      </div>
    </div>
  );

  function updateColumnUnit(): void {
    const updatedColumn = _.cloneDeep(props.column);
    updatedColumn.constants.set(MappedThing.UNIT, unitInput);
    props.onColumnUpdated(updatedColumn);
  }

  function updateColumn(
    mappingType: MappingType,
    mappedThing: MappedThing,
    placeType?: string,
    placeProperty?: string
  ): void {
    const updatedColumn: ColumnInfo = _.cloneDeep(props.column);
    updatedColumn.type = mappingType;
    updatedColumn.mappedThing = mappedThing;
    if (mappingType === MappingType.COLUMN) {
      updatedColumn.columnMappedThing = mappedThing;
    }
    if (mappingType === MappingType.COLUMN_HEADER) {
      updatedColumn.headerMappedThing = mappedThing;
    }
    // if placeType is updated, update that value for either header or column
    if (!_.isEmpty(placeType)) {
      const updatedPlaceType = props.placeDetector.placeTypes.get(placeType);
      const possibleProperties =
        props.validPlaceTypeProperties[placeType] || new Set();
      if (mappingType === MappingType.COLUMN) {
        updatedColumn.columnPlaceType = updatedPlaceType;
        updatedColumn.columnPlaceProperty = possibleProperties.has(
          updatedColumn.columnPlaceProperty
        )
          ? updatedColumn.columnPlaceProperty
          : Array.from(possibleProperties)[0];
      } else {
        updatedColumn.headerPlaceType = updatedPlaceType;
        updatedColumn.headerPlaceProperty = possibleProperties.has(
          updatedColumn.headerPlaceProperty
        )
          ? updatedColumn.headerPlaceProperty
          : Array.from(possibleProperties)[0];
      }
    }
    // if placeProperty is updated, update that value for either header or column
    if (!_.isEmpty(placeProperty)) {
      const updatedPlaceProperty =
        props.placeDetector.placeProperties.get(placeProperty);
      if (mappingType === MappingType.COLUMN) {
        updatedColumn.columnPlaceProperty = updatedPlaceProperty;
      } else {
        updatedColumn.headerPlaceProperty = updatedPlaceProperty;
      }
    }
    props.onColumnUpdated(updatedColumn);
  }

  function getPlaceTypePropertyInputs(mappingType: MappingType): JSX.Element {
    const typeVal =
      mappingType === MappingType.COLUMN
        ? props.column.columnPlaceType.dcid
        : props.column.headerPlaceType.dcid;
    const propertyVal =
      mappingType === MappingType.COLUMN
        ? props.column.columnPlaceProperty.dcid
        : props.column.headerPlaceProperty.dcid;
    return (
      <>
        of type
        {/* drop down for selecting the place type */}
        <Input
          id="column-type-place-type"
          className="column-option-dropdown"
          type="select"
          value={typeVal}
          onChange={(e): void =>
            updateColumn(mappingType, MappedThing.PLACE, e.target.value)
          }
        >
          {validPlaceTypes.map((type) => (
            <option value={type} key={type}>
              {props.placeDetector.placeTypes.get(type).displayName}
            </option>
          ))}
        </Input>
        and format
        {/* drop down for selecting the place property */}
        <Input
          id="column-type-place-property"
          className="column-option-dropdown"
          type="select"
          value={propertyVal}
          onChange={(e): void =>
            updateColumn(
              mappingType,
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
    );
  }
}
