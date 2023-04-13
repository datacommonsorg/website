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
 * Component for the mapping section for the constantVar template
 */

import _ from "lodash";
import React from "react";

import { MappingTemplateProps } from "../../templates";
import { MappedThing, MappingType, MappingVal } from "../../types";
import { MappingColumnInput } from "../shared/mapping_column_input";
import { MappingConstantInput } from "../shared/mapping_constant_input";
import { MappingPlaceInput } from "../shared/mapping_place_input";

export function ConstantVar(props: MappingTemplateProps): JSX.Element {
  return (
    <div id="constant-var">
      <MappingConstantInput
        mappedThing={MappedThing.STAT_VAR}
        mappingVal={props.userMapping.get(MappedThing.STAT_VAR)}
        onMappingValUpdate={(mappingVal: MappingVal) =>
          props.onMappingValUpdated(MappedThing.STAT_VAR, mappingVal)
        }
        isRequired={true}
      />
      <MappingColumnInput
        mappedThing={MappedThing.DATE}
        mappingVal={props.userMapping.get(MappedThing.DATE)}
        onMappingValUpdate={(mappingVal: MappingVal) =>
          props.onMappingValUpdated(MappedThing.DATE, mappingVal)
        }
        orderedColumns={props.csvData.orderedColumns}
        isRequired={true}
      />
      <MappingPlaceInput
        mappingType={MappingType.COLUMN}
        mappingVal={props.userMapping.get(MappedThing.PLACE)}
        onMappingValUpdate={(mappingVal: MappingVal) =>
          props.onMappingValUpdated(MappedThing.PLACE, mappingVal)
        }
        orderedColumns={props.csvData.orderedColumns}
      />
      <MappingColumnInput
        mappedThing={MappedThing.VALUE}
        mappingVal={props.userMapping.get(MappedThing.VALUE)}
        onMappingValUpdate={(mappingVal: MappingVal) =>
          props.onMappingValUpdated(MappedThing.VALUE, mappingVal)
        }
        orderedColumns={props.csvData.orderedColumns}
        isRequired={true}
      />
      <MappingColumnInput
        mappedThing={MappedThing.UNIT}
        mappingVal={props.userMapping.get(MappedThing.UNIT)}
        onMappingValUpdate={(mappingVal: MappingVal) =>
          props.onMappingValUpdated(MappedThing.UNIT, mappingVal)
        }
        orderedColumns={props.csvData.orderedColumns}
        isRequired={false}
      />
    </div>
  );
}
