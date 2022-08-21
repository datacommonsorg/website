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
import _, { split } from "lodash";

import {
  Column,
  DCProperty,
  DCType,
  MappedThing,
  Mapping,
  MappingType,
  MappingVal,
  TypeProperty,
} from "../types";

const COLUMN_KEY = "column";
const COLUMN_IDX_KEY = "columnIdx";
const DISP_NAME_KEY = "displayName";
const PLACETYPE_KEY = "placeType";
const PLACEPROP_KEY = "placeProperty";
const DCTYPE_KEY = "dcType";
const DCPROP_KEY = "dcProperty";
const HEADER_KEY = "headers";

const COLUMN_EMPTY: Column = { id: "", header: "", columnIdx: 0 };
const DCPROPERTY_EMPTY: DCProperty = { dcid: "", displayName: "" };
const DCTYPE_EMPTY: DCType = { dcid: "", displayName: "" };

function _replaceStrings(originalString: string): string {
  // Need to replace specific strings. Cannot do a blanket regex replacement
  // because it could end up replacing user provided values which we do not
  // want to edit. This only replaces the keys/fields which are different in
  // the API response compared to the attributes of the corresponding Types.
  originalString = originalString.split("column_idx").join(COLUMN_IDX_KEY);
  originalString = originalString.split("display_name").join(DISP_NAME_KEY);
  originalString = originalString.split("place_type").join(PLACETYPE_KEY);
  originalString = originalString.split("place_property").join(PLACEPROP_KEY);
  originalString = originalString.split("dc_type").join(DCTYPE_KEY);
  originalString = originalString.split("dc_property").join(DCPROP_KEY);
  return originalString;
}

/**
 * Given the detection json response from the detection server API,
 * parse it in to a Mapping structure.
 *
 * @param detectedJSONString is the JSON response from the server API.
 *
 * @returns a Mapping structure which has details of all the detected
 *  columns. If there are any unexpected validation errors, that particular
 *  MappingVal is skipped.
 */
export function parseDetectedJSON(detectedJSONString: string): Mapping {
  const mParsed: Mapping = JSON.parse(_replaceStrings(detectedJSONString));
  const mToReturn: Mapping = new Map<MappedThing, MappingVal>();

  // Some validations.
  for (const [key, mVal] of Object.entries(mParsed)) {
    // Keys must be among the MappedThing enum.
    if (!_.includes(Object.values(MappedThing), key)) {
      continue;
    }
    // Key "type" must be present and the value must be among MappingType enum.
    if (
      !_.includes(Object.keys(mVal), "type") &&
      !_.includes(Object.values(MappingType), mVal["type"])
    ) {
      continue;
    }

    // If key "column" is present then the value must be of type Column.
    let col: Column = COLUMN_EMPTY;
    if (_.includes(Object.keys(mVal), COLUMN_KEY) && mVal[COLUMN_KEY]) {
      const overlap = _.intersection(
        Object.keys(mVal[COLUMN_KEY]),
        Object.keys(COLUMN_EMPTY)
      );
      if (overlap.length != Object.keys(COLUMN_EMPTY).length) {
        return null;
      }
      col = mVal[COLUMN_KEY];
    }

    // If key "placeType" is present then the value must be of type DCType.
    // Note, if the validation succeeds, the value (DCType) is replaced by a map of
    // columnIdx (number) to the DCType.
    if (_.includes(Object.keys(mVal), PLACETYPE_KEY) && mVal[PLACETYPE_KEY]) {
      const overlap = _.intersection(
        Object.keys(mVal[PLACETYPE_KEY]),
        Object.keys(DCTYPE_EMPTY)
      );
      if (overlap.length != Object.keys(DCTYPE_EMPTY).length) {
        continue;
      }
      // If made this far, then mVal must also have had the column field. Extract the columnIdx
      // and assign it as a key to mVal["placeProperty"].
      if (col == COLUMN_EMPTY) {
        continue;
      }
      mVal[PLACETYPE_KEY] = { [col.columnIdx]: mVal[PLACETYPE_KEY] };
    }

    // If key "placeProperty" is present then the value must be of type DCProperty.
    // Note, if the validation succeeds, the value (DCProperty) is replaced by a map of
    // columnIdx (number) to the DCProperty.
    if (_.includes(Object.keys(mVal), PLACEPROP_KEY) && mVal[PLACEPROP_KEY]) {
      const overlap = _.intersection(
        Object.keys(mVal[PLACEPROP_KEY]),
        Object.keys(DCPROPERTY_EMPTY)
      );
      if (overlap.length != Object.keys(DCPROPERTY_EMPTY).length) {
        continue;
      }
      // If made this far, then mVal must also have had the column field. Extract the columnIdx
      // and assign it as a key to mVal["placeProperty"].
      if (col == COLUMN_EMPTY) {
        continue;
      }
      mVal[PLACEPROP_KEY] = { [col.columnIdx]: mVal[PLACEPROP_KEY] };
    }

    // If key "headers" is present, then the value must be an array for Columns.
    if (_.includes(Object.keys(mVal), HEADER_KEY) && mVal[HEADER_KEY]) {
      if (!Array.isArray(mVal[HEADER_KEY])) {
        continue;
      }
      for (const c of mVal[HEADER_KEY]) {
        const overlap = _.intersection(
          Object.keys(c),
          Object.keys(COLUMN_EMPTY)
        );
        if (!overlap.length) {
          continue;
        }
      }
    }
    mToReturn[key] = mVal;
  }
  return mToReturn;
}

/**
 * Given the supported DC types and Properties (for Places) json response
 * from the detection server API, parse it in to an array of TypeProperty
 * objects.
 *
 * @param supportedJSONString is the JSON response from the server API.
 *
 * @returns an array of TypeProperty objects. If there are any unexpected
 * validation errors, that particularTypeProperty is skipped.
 */
export function parseSupportedTypePropertiesJSON(
  supportedJSONString: string
): Array<TypeProperty> {
  const parsed: Array<TypeProperty> = JSON.parse(
    _replaceStrings(supportedJSONString)
  );
  const toBeReturned: Array<TypeProperty> = [];

  // Some validations.
  if (!Array.isArray(parsed)) {
    return toBeReturned;
  }

  for (const parsedTypeProp of parsed) {
    if (
      !_.has(parsedTypeProp, DCTYPE_KEY) ||
      !_.has(parsedTypeProp, DCPROP_KEY)
    ) {
      continue;
    }
    // Check that DCType is valid.
    let overlap = _.intersection(
      Object.keys(parsedTypeProp[DCTYPE_KEY]),
      Object.keys(DCTYPE_EMPTY)
    );
    if (overlap.length != Object.keys(DCTYPE_EMPTY).length) {
      continue;
    }
    // Check that DCProperty is valid.
    overlap = _.intersection(
      Object.keys(parsedTypeProp[DCPROP_KEY]),
      Object.keys(DCPROPERTY_EMPTY)
    );
    if (overlap.length != Object.keys(DCPROPERTY_EMPTY).length) {
      continue;
    }
    toBeReturned.push(parsedTypeProp);
  }
  return toBeReturned;
}
