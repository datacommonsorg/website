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

import _ from "lodash";
import React from "react";

import { NamedNode, StatVarGroupInfo } from "../shared/types";
import { StatVarGroupNode } from "./stat_var_group_node";

const VARIABLES_STATVAR_GROUP_PREFIX = "dc/g/Variables_";

interface StatVarGroupSectionPropType {
  path: string[];
  data: StatVarGroupInfo[];
  pathToSelection: string[];
  highlightedStatVar: React.RefObject<HTMLDivElement>;
  entities: NamedNode[];
  showAllSV: boolean;
  expandedPath: string[];
  // Number of entities that should have data for each stat var (group) shown
  numEntitiesExistence?: number;
}

export class StatVarGroupSection extends React.Component<StatVarGroupSectionPropType> {
  render(): JSX.Element {
    let childStatVarGroups = this.props.data;
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
                  entities={this.props.entities}
                  data={childStatVarGroup}
                  pathToSelection={this.props.pathToSelection.slice(1)}
                  startsOpened={
                    this.props.pathToSelection[0] === childStatVarGroup.id ||
                    this.props.expandedPath[0] === childStatVarGroup.id
                  }
                  isSelected={this.props.pathToSelection.length === 1}
                  showAllSV={this.props.showAllSV}
                  expandedPath={this.props.expandedPath.slice(1)}
                  numEntitiesExistence={this.props.numEntitiesExistence}
                />
              </div>
            );
          }
        })}
      </div>
    );
  }
}
