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
 * Component for selecting place mapping
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import { Input } from "reactstrap";

import {
  Column,
  DCProperty,
  DCType,
  MappedThing,
  MappingType,
  MappingVal,
  TypeProperty,
} from "../../types";
import { parseSupportedTypePropertiesResponse } from "../../utils/detection";
import { MappingColumnInput } from "./mapping_column_input";

interface MappingPlaceInputProps {
  mappingType: MappingType;
  mappingVal: MappingVal;
  onMappingValUpdate: (mappingVal: MappingVal) => void;
  orderedColumns: Array<Column>;
}

export function MappingPlaceInput(props: MappingPlaceInputProps): JSX.Element {
  const [placeTypes, setPlaceTypes] = useState<DCType[]>(null);
  // key is place type dcid and value is list of corresponding place properties
  const [placeTypeToProperties, setPlaceTypeToProperties] =
    useState<Record<string, DCProperty[]>>(null);
  const validPlaceProperties = getValidPlaceProperties();

  useEffect(() => {
    // TODO: Instead of fetching, pass the data with the html and set as ref on
    // component load.
    fetchPlaceTypeProperties();
  }, []);

  if (_.isNull(placeTypeToProperties)) {
    return null;
  }

  return (
    <MappingColumnInput
      mappedThing={MappedThing.PLACE}
      mappingVal={props.mappingVal}
      onMappingValUpdate={onPlaceUpdate}
      orderedColumns={props.orderedColumns}
      isRequired={true}
    >
      {!_.isEmpty(props.mappingVal) && (
        <div className="place-type-property-section">
          <div className="place-type-property-option">
            <span>Type:</span>
            <Input
              className="column-option-dropdown"
              type="select"
              value={
                props.mappingVal.placeType
                  ? props.mappingVal.placeType.dcid
                  : ""
              }
              onChange={(e): void => {
                const placeType = placeTypes.find(
                  (type) => type.dcid === e.target.value
                );
                onPlaceTypePropertyUpdate(
                  placeType,
                  props.mappingVal.placeProperty
                );
              }}
            >
              {placeTypes.map((placeType) => (
                <option value={placeType.dcid} key={placeType.dcid}>
                  {placeType.displayName}
                </option>
              ))}
            </Input>
          </div>
          <div className="place-type-property-option">
            <span>Format:</span>
            <Input
              className="column-option-dropdown"
              type="select"
              value={
                props.mappingVal.placeProperty
                  ? props.mappingVal.placeProperty.dcid
                  : ""
              }
              onChange={(e): void => {
                const placeProperty = validPlaceProperties.find(
                  (prop) => prop.dcid === e.target.value
                );
                onPlaceTypePropertyUpdate(
                  props.mappingVal.placeType,
                  placeProperty
                );
              }}
            >
              {validPlaceProperties.map((property) => (
                <option value={property.dcid} key={property.dcid}>
                  {property.displayName}
                </option>
              ))}
            </Input>
          </div>
        </div>
      )}
    </MappingColumnInput>
  );

  function fetchPlaceTypeProperties(): void {
    axios
      .get("/api/detection/supported_place_properties")
      .then((resp) => {
        const placeTypeProperties = parseSupportedTypePropertiesResponse(
          resp.data
        );
        const placeTypes = [];
        const placeTypeToProperties = {};
        placeTypeProperties.forEach((tp: TypeProperty) => {
          if (!(tp.dcType.dcid in placeTypeToProperties)) {
            placeTypes.push(tp.dcType);
            placeTypeToProperties[tp.dcType.dcid] = [];
          }
          if (tp.dcProperty) {
            placeTypeToProperties[tp.dcType.dcid].push(tp.dcProperty);
          }
        });
        setPlaceTypes(placeTypes);
        setPlaceTypeToProperties(placeTypeToProperties);
      })
      .catch(() => {
        setPlaceTypes([]);
        setPlaceTypeToProperties({});
      });
  }

  function getValidPlaceProperties(): DCProperty[] {
    if (!placeTypeToProperties) {
      return [];
    }
    let validPlaceProperties = [];
    if (props.mappingVal && props.mappingVal.placeType) {
      validPlaceProperties = Object.values(
        placeTypeToProperties[props.mappingVal.placeType.dcid] || {}
      );
    } else if (!_.isEmpty(placeTypes)) {
      validPlaceProperties = Object.values(
        placeTypeToProperties[placeTypes[0].dcid] || {}
      );
    }
    return validPlaceProperties;
  }

  function onPlaceUpdate(newMappingVal: MappingVal): void {
    if (_.isEmpty(newMappingVal)) {
      props.onMappingValUpdate(newMappingVal);
    }
    // get place type and place property for the mapping val
    let placeType = !_.isEmpty(placeTypes) ? placeTypes[0] : null;
    let placeProperty = !_.isEmpty(validPlaceProperties)
      ? validPlaceProperties[0]
      : null;
    if (props.mappingVal) {
      placeType = props.mappingVal.placeType || placeType;
      placeProperty = props.mappingVal.placeProperty || placeProperty;
    }
    newMappingVal.placeType = placeType;
    newMappingVal.placeProperty = placeProperty;
    props.onMappingValUpdate(newMappingVal);
  }

  function onPlaceTypePropertyUpdate(
    placeType: DCType,
    placeProperty?: DCProperty
  ): void {
    const possibleProperties = placeTypeToProperties[placeType.dcid] || [];
    const possiblePropertyDcids = new Set(
      possibleProperties.map((prop) => prop.dcid)
    );
    let updatedPlaceProperty = placeProperty;
    // If no place property selected or selected place property is not valid for
    // the selected place type, update place property to a valid one
    if (
      _.isEmpty(placeProperty) ||
      !possiblePropertyDcids.has(placeProperty.dcid)
    ) {
      updatedPlaceProperty = !_.isEmpty(possibleProperties)
        ? possibleProperties[0]
        : null;
    }
    const updatedMappingVal = {
      ...props.mappingVal,
      placeProperty: updatedPlaceProperty,
      placeType,
    };
    props.onMappingValUpdate(updatedMappingVal);
  }
}
