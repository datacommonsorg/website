/**
 * Copyright 2020 Google LLC
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
 * Component for rendering the stat var hierarchy section which has a search
 * section and the hierarchy section.
 */

import React from "react";
import axios from "axios";
import _ from "lodash";
import { StatVarHierarchySearch } from "./statvar_hierarchy_search";
import { StatVarGroupNode } from "./statvar_group_node";
import { StatVarGroupNodeType, StatVarNodeType } from "./util";

interface StatVarHierarchyPropType {
  dcid: string;
  placeName: string;
}

interface StatVarHierarchyStateType {
  statVarGroups: { [svgId: string]: StatVarGroupNodeType };
  statVars: { [statVarId: string]: StatVarNodeType };
  pathToSelection: string[];
}

const SORTED_FIRST_SVG_ID = "dc/g/Demographics";
const SORTED_LAST_SVG_ID = "dc/g/Miscellaneous";
export class StatVarHierarchy extends React.Component<
  StatVarHierarchyPropType,
  StatVarHierarchyStateType
> {
  constructor(props: StatVarHierarchyPropType) {
    super(props);
    this.state = {
      statVarGroups: {},
      statVars: {},
      pathToSelection: [],
    };
    this.onSearchSelectionChange = this.onSearchSelectionChange.bind(this);
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.statVars)) {
      return null;
    }
    const initialStatVarGroups = Object.keys(this.state.statVarGroups).filter(
      (svgId) => !("parent" in this.state.statVarGroups[svgId])
    );
    initialStatVarGroups.sort((a, b) => {
      if (a === SORTED_FIRST_SVG_ID) {
        return -1;
      }
      if (b === SORTED_FIRST_SVG_ID) {
        return 1;
      }
      if (a === SORTED_LAST_SVG_ID) {
        return 1;
      }
      if (b === SORTED_LAST_SVG_ID) {
        return -1;
      }
      return a > b ? 1 : -1;
    });
    return (
      <div className="stat-var-hierarchy-container card">
        <StatVarHierarchySearch
          statVarGroupsData={this.state.statVarGroups}
          statVarsData={this.state.statVars}
          onSelectionChange={this.onSearchSelectionChange}
        />
        <div className="hierarchy-section">
          {initialStatVarGroups.map((svgId) => {
            if (
              _.isEmpty(this.state.pathToSelection) ||
              this.state.pathToSelection[0] === svgId
            ) {
              return (
                <StatVarGroupNode
                  placeDcid={this.props.dcid}
                  placeName={this.props.placeName}
                  statVarGroupId={svgId}
                  data={this.state.statVarGroups}
                  pathToSelection={this.state.pathToSelection.slice(1)}
                  isSelected={this.state.pathToSelection.length === 1}
                  open={this.state.pathToSelection[0] === svgId}
                  key={svgId}
                />
              );
            }
          })}
        </div>
      </div>
    );
  }

  private fetchData(): void {
    axios
      .get(`/api/browser/statvar-hierarchy/${this.props.dcid}`)
      .then((resp) => {
        const data = resp.data;
        const statVarGroups = data["statVarGroups"];
        const statVars = data["statVars"];
        this.setState({
          statVarGroups,
          statVars,
        });
      });
  }

  private onSearchSelectionChange(selection: string): void {
    const pathToSelection = [];
    if (!_.isEmpty(selection)) {
      pathToSelection.push(selection);
      let parent = null;
      if (selection in this.state.statVars) {
        parent = this.state.statVars[selection].parent;
      } else if (selection in this.state.statVarGroups) {
        parent = this.state.statVarGroups[selection].parent;
      }
      while (parent) {
        pathToSelection.unshift(parent);
        parent = this.state.statVarGroups[parent].parent;
      }
    }
    this.setState({
      pathToSelection: pathToSelection,
    });
  }
}
