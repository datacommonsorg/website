/**
 * Copyright 2024 Google LLC
 *
 * Licensed under he Apache License, Version 2.0 (the "License");
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
 * Component for displaying entity pvs
 */

import _ from "lodash";
import React from "react";

import { Node } from "../../shared/api_response_types";
import { EntityPvConfig } from "../../types/app/nl_interface_types";

interface EntityPvSectionPropType {
  config: EntityPvConfig;
}

function getValueString(values: Node[]): string {
  const valStrings = values.map((val) => val.name || val.dcid || val.value);
  return valStrings.join(", ");
}

export function EntityPvSection(props: EntityPvSectionPropType): JSX.Element {
  // Currently the NL only supports one property and entity, but will support
  // more in the future.
  const shouldShowTable =
    props.config.properties.length > 1 || props.config.entities.length > 1;
  const valueString = shouldShowTable
    ? ""
    : getValueString(
        props.config.propertyValues[props.config.entities[0].dcid][
          props.config.properties[0].dcid
        ]
      );
  return (
    <div className="container">
      <div>{props.config.title}</div>
      {shouldShowTable ? <div></div> : <div>{valueString}</div>}
    </div>
  );
}
