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
import { StatVarGroupNodeType, StatVarNodeType } from "./types";
import { NamedPlace } from "../shared/types";
import { loadSpinner, removeSpinner } from "./util";
import { Context } from "../shared/context";
import { StatVarHierarchyType } from "../shared/types";

const LOADING_CONTAINER_ID = "stat-var-hierarchy-section";
const SORTED_FIRST_SVG_ID = "dc/g/Demographics";
const SORTED_LAST_SVG_ID = "dc/g/Miscellaneous";

interface StatVarHierarchyPropType {
  places: NamedPlace[];
  statVars?: string[];
}

interface StatVarHierarchyStateType {
  statVarGroups: { [svgId: string]: StatVarGroupNodeType };
  statVars: { [statVarId: string]: StatVarNodeType };
  selectionPath: string[];
  statVarPath: Record<string, string[]>;
  errorMessage: string;
  toggleStatVarPath: (statVar: string) => void;
}

export class StatVarHierarchy extends React.Component<
  StatVarHierarchyPropType,
  StatVarHierarchyStateType
> {
  constructor(props: StatVarHierarchyPropType) {
    super(props);
    this.state = {
      errorMessage: "",
      selectionPath: [],
      statVarPath: {},
      statVarGroups: {},
      statVars: {},
      toggleStatVarPath: this.toggleStatVarPath,
    };
    this.onSearchSelectionChange = this.onSearchSelectionChange.bind(this);
    this.getPath = this.getPath.bind(this);
    this.toggleStatVarPath = this.toggleStatVarPath.bind(this);
  }

  toggleStatVarPath(statVar: string, path?: string[]): void {
    if (statVar in this.state.statVarPath) {
      const tmp = _.cloneDeep(this.state.statVarPath);
      delete tmp[statVar];
      this.setState({ statVarPath: tmp });
    } else {
      this.setState({
        statVarPath: Object.assign({ [statVar]: path }, this.state.statVarPath),
      });
    }
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    // TODO(shifucun): this should be obtained from the root of root.
    const rootStatVarGroups = Object.keys(this.state.statVarGroups).filter(
      (svgId) => !("parent" in this.state.statVarGroups[svgId])
    );
    rootStatVarGroups.sort((a, b) => {
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
    console.log("render");
    return (
      <div id={LOADING_CONTAINER_ID} className="loading-spinner-container">
        {!_.isEmpty(this.state.errorMessage) && (
          <div className="error-message">{this.state.errorMessage}</div>
        )}
        {!_.isEmpty(this.state.statVars) && (
          <div className="stat-var-hierarchy-container card">
            <StatVarHierarchySearch
              statVarGroupsData={this.state.statVarGroups}
              statVarsData={this.state.statVars}
              onSelectionChange={this.onSearchSelectionChange}
            />
            <div className="hierarchy-section">
              {rootStatVarGroups.map((svgId) => {
                if (
                  _.isEmpty(this.state.selectionPath) ||
                  this.state.selectionPath[0] === svgId
                ) {
                  return (
                    <Context.Provider
                      value={{
                        statVarHierarchyType: StatVarHierarchyType.TIMELINE,
                        statVarPath: this.state.statVarPath,
                        toggleStatVarPath: this.toggleStatVarPath,
                      }}
                      key={svgId}
                    >
                      <StatVarGroupNode
                        level={0}
                        places={this.props.places}
                        statVarGroupId={svgId}
                        data={this.state.statVarGroups}
                        pathToSelection={this.state.selectionPath.slice(1)}
                        isSelected={this.state.selectionPath.length === 1}
                        open={this.state.selectionPath[0] === svgId}
                        getPath={this.getPath}
                      />
                    </Context.Provider>
                  );
                }
              }, this)}
            </div>
          </div>
        )}
        <div id="browser-screen" className="screen">
          <div id="spinner"></div>
        </div>
      </div>
    );
  }

  private fetchData(): void {
    loadSpinner(LOADING_CONTAINER_ID);
    axios
      .post("/api/browser/statvar-hierarchy", {
        dcids: this.props.places.map((place) => place.dcid),
      })
      .then((resp) => {
        const data = resp.data;
        const statVarGroups = data["statVarGroups"];
        const statVars = data["statVars"];
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          statVarGroups,
          statVars,
        });
        const statVarPath = {};
        for (const statVar of this.props.statVars) {
          statVarPath[statVar] = this.getPath(statVar);
        }
        this.setState({
          statVarPath,
        });
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieving stat var hierarchy.",
        });
      });
  }

  private onSearchSelectionChange(selection: string): void {
    const path = this.getPath(selection);
    this.setState({
      selectionPath: path,
      statVarPath: Object.assign({ [selection]: path }, this.state.statVarPath),
    });
  }

  private getPath(statVar: string): string[] {
    if (statVar == "") {
      return [];
    }
    const path = [];
    path.push(statVar);
    let parent = null;
    if (statVar in this.state.statVars) {
      parent = this.state.statVars[statVar].parent;
    } else if (statVar in this.state.statVarGroups) {
      parent = this.state.statVarGroups[statVar].parent;
    }
    while (parent) {
      path.unshift(parent);
      parent = this.state.statVarGroups[parent].parent;
    }
    return path;
  }
}

StatVarHierarchy.contextType = Context;
