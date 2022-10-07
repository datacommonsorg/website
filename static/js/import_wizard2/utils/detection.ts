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

import {
  Column,
  MappedThing,
  Mapping,
  MappingType,
  MappingVal,
  TypeProperty,
} from "../types";

const COLUMN_API_KEY = "column";
const COLUMN_ID_API_KEY = "id";
const COLUMN_HEADER_API_KEY = "header";
const COLUMN_IDX_API_KEY = "column_idx";
const DCID_API_KEY = "dcid";
const DISP_NAME_API_KEY = "display_name";
const PLACETYPE_API_KEY = "place_type";
const PLACEPROP_API_KEY = "place_property";
const DCTYPE_API_KEY = "dc_type";
const DCPROP_API_KEY = "dc_property";
const HEADER_API_KEY = "headers";

function isDCTypeOrProperty(entity: Record<string, any>): boolean {
  if (_.has(entity, DCID_API_KEY) && _.has(entity, DISP_NAME_API_KEY)) {
    return true;
  }
  return false;
}

function isColumn(candidate: Record<string, any>): boolean {
  if (
    _.has(candidate, COLUMN_ID_API_KEY) &&
    _.has(candidate, COLUMN_HEADER_API_KEY) &&
    _.has(candidate, COLUMN_IDX_API_KEY)
  ) {
    return true;
  }
  return false;
}

/**
 * Given the API response from the detection server API,
 * parse it in to a Mapping structure.
 *
 * @param detectedResponse is the Object response from the server API.
 *
 * @returns a Mapping structure which has details of all the detected
 *  columns. If there are any unexpected validation errors, that particular
 *  MappingVal is skipped.
 *
 * TODO: log/show errors in cases of unexpected parsing problems.
 */
export function parseDetectionApiResponse(
  detectedResponse: Record<string, any>
): Mapping {
  const mToReturn: Mapping = new Map<MappedThing, MappingVal>();

  // Some validations.
  // TODO: move the validations to helper functions.
  for (const [mThing, mVal] of Object.entries(detectedResponse)) {
    // Keys must be among the MappedThing enum.
    if (!_.includes(Object.values(MappedThing), mThing)) {
      continue;
    }
    // Key "type" must be present and the value must be among MappingType enum.
    if (
      !_.includes(Object.keys(mVal), "type") ||
      !_.includes(Object.values(MappingType), mVal["type"])
    ) {
      continue;
    }
    const mValValidated: MappingVal = { type: mVal["type"] };

    // If key "column" is present then the value must be of type Column.
    let col: Column;
    if (_.has(mVal, COLUMN_API_KEY) && mVal[COLUMN_API_KEY]) {
      const candidateCol = mVal[COLUMN_API_KEY];
      if (isColumn(candidateCol)) {
        col = {
          id: candidateCol[COLUMN_ID_API_KEY],
          header: candidateCol[COLUMN_HEADER_API_KEY],
          columnIdx: candidateCol[COLUMN_IDX_API_KEY],
        };
        mValValidated.column = col;
      }
    }

    // If key "placeType" is present then the value must be of type DCType.
    if (_.has(mVal, PLACETYPE_API_KEY) && mVal[PLACETYPE_API_KEY]) {
      if (!isDCTypeOrProperty(mVal[PLACETYPE_API_KEY])) {
        continue;
      }
      // If made this far, then mVal must also have had the column field. Extract the columnIdx
      // and assign it as a key to mVal["placeProperty"].
      if (_.isEmpty(col)) {
        continue;
      }
      mValValidated.placeType = {
        dcid: mVal[PLACETYPE_API_KEY][DCID_API_KEY],
        displayName: mVal[PLACETYPE_API_KEY][DISP_NAME_API_KEY],
      };
    }

    // If key "placeProperty" is present then the value must be of type DCProperty.
    if (_.has(mVal, PLACEPROP_API_KEY) && mVal[PLACEPROP_API_KEY]) {
      if (!isDCTypeOrProperty(mVal[PLACEPROP_API_KEY])) {
        continue;
      }
      // If made this far, then mVal must also have had the column field. Extract the columnIdx
      // and assign it as a key to mVal["placeProperty"].
      if (_.isEmpty(col)) {
        continue;
      }
      mValValidated.placeProperty = {
        dcid: mVal[PLACEPROP_API_KEY][DCID_API_KEY],
        displayName: mVal[PLACEPROP_API_KEY][DISP_NAME_API_KEY],
      };
    }

    // If key "headers" is present, then the value must be an array for Columns.
    if (_.has(mVal, HEADER_API_KEY) && mVal[HEADER_API_KEY]) {
      if (!Array.isArray(mVal[HEADER_API_KEY])) {
        continue;
      }
      const headers: Array<Column> = [];
      for (const c of mVal[HEADER_API_KEY]) {
        if (isColumn(c)) {
          headers.push({
            id: c[COLUMN_ID_API_KEY],
            header: c[COLUMN_HEADER_API_KEY],
            columnIdx: c[COLUMN_IDX_API_KEY],
          });
        }
      }
      if (headers.length > 0) {
        mValValidated.headers = headers;
      }
    }
    if (!_.isEmpty(mValValidated)) {
      mToReturn[mThing] = mValValidated;
    }
  }
  return mToReturn;
}

/**
 * Given the supported DC types and Properties (for Places) response
 * from the detection server API, parse it in to an array of TypeProperty
 * objects.
 *
 * @param supportedTypesApiResponse is the Array of Objects response from the server API.
 *
 * @returns an array of TypeProperty objects. If there are any unexpected
 * validation errors, that particularTypeProperty is skipped.
 */
export function parseSupportedTypePropertiesResponse(
  supportedTypesApiResponse: Array<Record<string, any>>
): Array<TypeProperty> {
  const toBeReturned: Array<TypeProperty> = [];

  // Some validations.
  if (!Array.isArray(supportedTypesApiResponse)) {
    return toBeReturned;
  }

  for (const typeProp of supportedTypesApiResponse) {
    // Check that both DCType and DCProperty keys are present.
    if (!_.has(typeProp, DCTYPE_API_KEY) || !_.has(typeProp, DCPROP_API_KEY)) {
      continue;
    }
    // Check that the DCType and DCProperty fields are present.
    if (
      !isDCTypeOrProperty(typeProp[DCTYPE_API_KEY]) ||
      !isDCTypeOrProperty(typeProp[DCPROP_API_KEY])
    ) {
      continue;
    }

    toBeReturned.push({
      dcType: {
        dcid: typeProp[DCTYPE_API_KEY][DCID_API_KEY],
        displayName: typeProp[DCTYPE_API_KEY][DISP_NAME_API_KEY],
      },
      dcProperty: {
        dcid: typeProp[DCPROP_API_KEY][DCID_API_KEY],
        displayName: typeProp[DCPROP_API_KEY][DISP_NAME_API_KEY],
      },
    });
  }
  return toBeReturned;
}
