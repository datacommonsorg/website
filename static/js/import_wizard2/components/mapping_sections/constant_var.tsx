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

import React from "react";

import { MappingSectionProps } from "../../templates";
import { MappedThing, MappingVal } from "../../types";

export function ConstantVar(props: MappingSectionProps): JSX.Element {
  let placeMapping, dateMapping, unitMapping: MappingVal;

  props.predictedMapping &&
    props.predictedMapping.forEach((mappingVal, mappedThing) => {
      switch (mappedThing) {
        case MappedThing.PLACE:
          placeMapping = mappingVal;
          break;
        case MappedThing.DATE:
          dateMapping = mappingVal;
          break;
        case MappedThing.UNIT:
          unitMapping = mappingVal;
          break;
        default:
          console.log(
            `Ignoring inferred mapping of type ${mappedThing}: ${mappingVal}`
          );
      }
    });

  return (
    <section>
      <h3>Choose column titles containing data about these fields:</h3>
      <table>
        <tbody>
          <tr>
            <td>Place*:</td>
            <td>[{placeMapping && placeMapping.column.header}]</td>
          </tr>
          <tr>
            <td>Variable*:</td>
            <td></td>
          </tr>
          <tr>
            <td>Date*:</td>
            <td>[{dateMapping && dateMapping.column.header}]</td>
          </tr>
          <tr>
            <td>Unit*:</td>
            <td>[{unitMapping && unitMapping.column.header}]</td>
          </tr>
          <tr>
            {/* TODO: fill in with leftover columns. */}
            <td>Ignored columns:</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
