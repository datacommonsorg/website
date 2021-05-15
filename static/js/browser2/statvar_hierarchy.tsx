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

const LOADING_CONTAINER_ID = "stat-var-hierarchy-section";
const SORTED_FIRST_SVG_ID = "dc/g/Demographics";
const SORTED_LAST_SVG_ID = "dc/g/Miscellaneous";

interface StatVarHierarchyPropType {
  type: string;
  places: NamedPlace[];
  // (Optional) A list of stat vars selected from parent componenet.
  // For example, in timeline tool, these are stat vars parsed from URL.
  svs?: string[];
}

interface StatVarHierarchyStateType {
  // A map from stat var group dcid to the metadata.
  svgInfo: { [svgId: string]: StatVarGroupNodeType };
  // A map from stat var dcid to the metadata.
  svInfo: { [svId: string]: StatVarNodeType };
  // The stat var (group) from search result. The hierarchy focuses on it by
  // displaying the path from root to it.
  focus?: string;
  // The path to the focus node. If the focus is not an svg, it will not be
  // stored in this.state.svPath.
  focusPath: string[];
  // Map from stat var dcid to the path for all selected stat vars.
  svPath: Record<string, string[]>;
  errorMessage: string;
  // Select or de-select a stat var with its path.
  togglePath: (sv: string, path?: string[]) => void;
}

export class StatVarHierarchy extends React.Component<
  StatVarHierarchyPropType,
  StatVarHierarchyStateType
> {
  constructor(props: StatVarHierarchyPropType) {
    super(props);
    this.state = {
      errorMessage: "",
      focus: null,
      focusPath: [],
      svPath: {},
      svgInfo: {},
      svInfo: {},
      togglePath: this.togglePath,
    };
    this.onSearchSelectionChange = this.onSearchSelectionChange.bind(this);
    this.togglePath = this.togglePath.bind(this);
  }

  togglePath(sv: string, path?: string[]): void {
    if (sv in this.state.svPath) {
      const tmp = _.cloneDeep(this.state.svPath);
      delete tmp[sv];
      this.setState({ svPath: tmp });
    } else {
      this.setState({
        svPath: Object.assign({ [sv]: path }, this.state.svPath),
      });
    }
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    // TODO(shifucun): this should be obtained from the root of root.
    const rootSVGs = Object.keys(this.state.svgInfo).filter(
      (svgId) => !("parent" in this.state.svgInfo[svgId])
    );
    rootSVGs.sort((a, b) => {
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
      <div id={LOADING_CONTAINER_ID} className="loading-spinner-container">
        {!_.isEmpty(this.state.errorMessage) && (
          <div className="error-message">{this.state.errorMessage}</div>
        )}
        {!_.isEmpty(this.state.svInfo) && (
          <div className="stat-var-hierarchy-container card">
            <StatVarHierarchySearch
              statVarGroupsData={this.state.svgInfo}
              statVarsData={this.state.svInfo}
              onSelectionChange={this.onSearchSelectionChange}
            />
            <div className="hierarchy-section">
              {rootSVGs.map((svgId) => {
                if (
                  _.isEmpty(this.state.focus) ||
                  this.state.focusPath[0] === svgId
                ) {
                  return (
                    <Context.Provider
                      value={{
                        statVarHierarchyType: this.props.type,
                        svPath: this.state.svPath,
                        togglePath: this.togglePath,
                      }}
                      key={svgId}
                    >
                      <StatVarGroupNode
                        path={[svgId]}
                        places={this.props.places}
                        statVarGroupId={svgId}
                        data={this.state.svgInfo}
                        pathToSelection={this.state.focusPath.slice(1)}
                        isSelected={this.state.focusPath.length === 1}
                        open={this.state.focusPath[0] === svgId}
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
        const svgInfo = data["statVarGroups"];
        const svInfo = data["statVars"];
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          svgInfo,
          svInfo,
        });
        const svPath = {};
        if (this.props.svs) {
          for (const sv of this.props.svs) {
            svPath[sv] = this.getPath(sv);
          }
          this.setState({
            svPath,
          });
        }
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieving stat var hierarchy",
        });
      });
  }

  private onSearchSelectionChange(selection: string): void {
    const path = this.getPath(selection);
    this.setState({
      focus: selection,
      focusPath: path,
    });
    // If selection is stat var, added it to svPath.
    if (!selection.startsWith("dc/g")) {
      this.setState({
        svPath: Object.assign({ [selection]: path }, this.state.svPath),
      });
    }
  }

  private getPath(sv: string): string[] {
    if (sv == "") {
      return [];
    }
    const path = [];
    path.push(sv);
    let parent = null;
    if (sv in this.state.svInfo) {
      parent = this.state.svInfo[sv].parent;
    } else if (sv in this.state.svgInfo) {
      parent = this.state.svgInfo[sv].parent;
    }
    while (parent) {
      path.unshift(parent);
      parent = this.state.svgInfo[parent].parent;
    }
    return path;
  }
}
