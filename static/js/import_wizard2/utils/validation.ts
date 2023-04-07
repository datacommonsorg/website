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
  MAPPED_THING_NAMES,
  MappedThing,
  Mapping,
  MappingType,
  MappingVal,
} from "../types";

/*
 * Checks the provided mapping and returns an array of errors found in it.
 * On a successful check, the returned array is empty.
 *
 * List of checks:
 * (1) MappingVal should have the right field set depending on MappingType
 * (2) The Main Three - place, statvar and date - must be mapped
 * (3) At most one MappedThing can be a COLUMN_HEADER
 * (4) If there are no COLUMN_HEADER mappings, VALUE should be mapped
 *     (a) Conversely, if COLUMN_HEADER mapping exists, VALUE must not be mapped
 * (5) At least one of the mappings must specify a COLUMN or a COLUMN_HEADER
 * (6) PLACE must specify placeProperty
 * (7) VALUE, if it appears, has to be COLUMN
 * (8) PLACE should not be CONSTANT (its atypical and not exposed in UI)
 * (9) For COLUMN_HEADER mapping, each column should only be seen at most once
 *
 * TODO: Consider returning enum + string pair for error categories
 *
 * @param {mappings} CSV mappings
 * @returns {Array<string>} list of error messages
 */
export function checkMappings(mappings: Mapping): Array<string> {
  const errors = Array<string>();
  for (const mthing of [
    MappedThing.PLACE,
    MappedThing.STAT_VAR,
    MappedThing.DATE,
  ]) {
    if (!mappings.has(mthing)) {
      // Check #2
      const mThingName = MAPPED_THING_NAMES[mthing] || mthing;
      errors.push("Missing required mapping for " + mThingName);
    }
  }

  const colHdrThings = Array<string>();
  let numNonConsts = 0;
  mappings.forEach((mval: MappingVal, mthing: MappedThing) => {
    const mthingName = MAPPED_THING_NAMES[mthing] || mthing;
    if (mval.type === MappingType.COLUMN) {
      if (mval.column == null || mval.column.id === "") {
        // Check #1
        errors.push(mthingName + ": missing value for COLUMN type ");
      }
      if (mthing === MappedThing.PLACE) {
        if (_.isEmpty(mval.placeProperty)) {
          // Check #6
          errors.push("Place mapping is missing placeProperty");
        }
      }
      numNonConsts++;
    } else if (mval.type === MappingType.COLUMN_HEADER) {
      if (mval.headers == null || mval.headers.length === 0) {
        // Check #1
        errors.push(mthingName + ": missing value for COLUMN_HEADER type");
      } else {
        const seenHeaders = new Set();
        for (const header of mval.headers) {
          if (!header) {
            // Check #1
            errors.push(
              mthingName + ": incomplete value for COLUMN_HEADER type"
            );
            break;
          }
          if (seenHeaders.has(header.columnIdx)) {
            // Check # 9
            errors.push(
              mthingName +
                ": found duplicate column in the value for COLUMN_HEADER type"
            );
            break;
          }
          seenHeaders.add(header.columnIdx);
        }
      }
      if (mthing === MappedThing.PLACE) {
        if (_.isEmpty(mval.placeProperty)) {
          // Check #6
          errors.push("Place mapping is missing placeProperty");
        }
      }
      colHdrThings.push(mthing);
      numNonConsts++;
    } else if (mval.type === MappingType.FILE_CONSTANT) {
      if (mval.fileConstant == null || mval.fileConstant.length === 0) {
        // Check #1
        errors.push(mthingName + ": missing value for FILE_CONSTANT type");
      }
      if (mthing === MappedThing.PLACE) {
        // Check #8
        errors.push(mthingName + ": must not be FILE_CONSTANT type");
      }
    } else if (mval.type === MappingType.COLUMN_CONSTANT) {
      if (_.isEmpty(mval.columnConstants)) {
        // Check #1
        errors.push(mthingName + ": missing value for COLUMN_CONSTANT type");
      }
    }
    if (mthing === MappedThing.VALUE && mval.type !== MappingType.COLUMN) {
      // Check #7
      errors.push(mthingName + ": must be a COLUMN type");
    }
  });
  if (numNonConsts === 0) {
    // Check #5
    errors.push("Atleast one mapping should identify a column");
  }
  if (colHdrThings.length === 0) {
    if (!mappings.has(MappedThing.VALUE)) {
      // Check #4
      errors.push("Unable to detect 'Observation Value' column");
    }
  } else if (colHdrThings.length === 1) {
    if (mappings.has(MappedThing.VALUE)) {
      // Check #4a
      errors.push("Found multiple confusing 'Observation Value' columns");
    }
  } else {
    // Check #3
    errors.push(
      "Multiple " +
        MappingType.COLUMN_HEADER +
        " mappings found: " +
        colHdrThings.join(", ")
    );
  }

  return errors;
}
