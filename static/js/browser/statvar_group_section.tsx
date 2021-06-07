/**
 * Copyright 2021 Google LLC
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
 * Component for rendering a section that contains a list of stat var groups
 * in the stat var hierarchy.
 */

import React from "react";
import _ from "lodash";

import { StatVarGroupNodeType } from "./types";
import { NamedPlace } from "../shared/types";
import { StatVarGroupNode } from "./statvar_group_node";

const VARIABLES_STATVAR_GROUP_PREFIX = "dc/g/Variables_";

interface StatVarGroupSectionPropType {
  path: string[];
  data: { [key: string]: StatVarGroupNodeType };
  statVarGroupId: string;
  pathToSelection: string[];
  highlightedStatVar: React.RefObject<HTMLDivElement>;
  places: NamedPlace[];
}

export class StatVarGroupSection extends React.Component<
  StatVarGroupSectionPropType
> {
  render(): JSX.Element {
    let childStatVarGroups = this.props.data[this.props.statVarGroupId]
      .childStatVarGroups;
    const variableGroupItem = childStatVarGroups.find((svg) =>
      svg.id.startsWith(VARIABLES_STATVAR_GROUP_PREFIX)
    );
    if (variableGroupItem) {
      childStatVarGroups = childStatVarGroups.filter(
        (svg) => !svg.id.startsWith(VARIABLES_STATVAR_GROUP_PREFIX)
      );
      childStatVarGroups.unshift(variableGroupItem);
    }
    return (
      <div className="svg-node-child">
        {childStatVarGroups.map((childStatVarGroup) => {
          if (
            _.isEmpty(this.props.pathToSelection) ||
            this.props.pathToSelection[0] === childStatVarGroup.id
          ) {
            return (
              <div
                key={childStatVarGroup.id}
                ref={
                  this.props.pathToSelection.length === 1
                    ? this.props.highlightedStatVar
                    : null
                }
              >
                <StatVarGroupNode
                  path={this.props.path.concat([childStatVarGroup.id])}
                  places={this.props.places}
                  statVarGroupId={childStatVarGroup.id}
                  data={this.props.data}
                  pathToSelection={this.props.pathToSelection.slice(1)}
                  specializedEntity={childStatVarGroup.specializedEntity}
                  startsOpened={
                    this.props.pathToSelection[0] === childStatVarGroup.id
                  }
                  isSelected={this.props.pathToSelection.length === 1}
                />
              </div>
            );
          }
        })}
      </div>
    );
  }
}
