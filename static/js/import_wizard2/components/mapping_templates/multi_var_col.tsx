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
 * Component for the mapping section for the multiVarCol template
 */

import _ from "lodash";
import React from "react";

import { INVALID_VARIABLE_MSG } from "../../constants";
import { MappingTemplateProps } from "../../templates";
import {
  Column,
  MAPPED_THING_NAMES,
  MappedThing,
  MappingType,
  MappingVal,
} from "../../types";
import { isValidVariable } from "../../utils/validation";
import { MappingColumnInput } from "../shared/mapping_column_input";
import { MappingHeaderInput } from "../shared/mapping_header_input";
import { MappingPlaceInput } from "../shared/mapping_place_input";

export function MultiVarCol(props: MappingTemplateProps): JSX.Element {
  return (
    <div id="multi-var-col">
      <MappingPlaceInput
        mappingType={MappingType.COLUMN}
        mappingVal={props.userMapping.get(MappedThing.PLACE)}
        onMappingValUpdate={(mappingVal: MappingVal) =>
          props.onMappingValUpdate(MappedThing.PLACE, mappingVal, false)
        }
        orderedColumns={props.csvData.orderedColumns}
      />
      <MappingColumnInput
        mappedThing={MappedThing.DATE}
        mappingVal={props.userMapping.get(MappedThing.DATE)}
        onMappingValUpdate={(mappingVal: MappingVal) =>
          props.onMappingValUpdate(MappedThing.DATE, mappingVal, false)
        }
        orderedColumns={props.csvData.orderedColumns}
        isRequired={true}
      />
      <MappingHeaderInput
        mappedThingName={
          MAPPED_THING_NAMES[MappedThing.STAT_VAR] || MappedThing.STAT_VAR
        }
        mappingVal={props.userMapping.get(MappedThing.STAT_VAR)}
        onMappingValUpdate={(mappingVal: MappingVal, hasInputErrors: boolean) =>
          props.onMappingValUpdate(
            MappedThing.STAT_VAR,
            mappingVal,
            hasInputErrors
          )
        }
        orderedColumns={props.csvData.orderedColumns}
        isValidHeader={isValidVariable}
        invalidHeaderMsg={INVALID_VARIABLE_MSG}
      />
      <MappingColumnInput
        mappedThing={MappedThing.UNIT}
        mappingVal={props.userMapping.get(MappedThing.UNIT)}
        onMappingValUpdate={(mappingVal) =>
          props.onMappingValUpdate(MappedThing.UNIT, mappingVal, false)
        }
        orderedColumns={props.csvData.orderedColumns}
        isRequired={false}
      />
    </div>
  );
}
