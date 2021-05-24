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
  focus?: string;
  // The path to the focus node. If the focus is an svg, it will not be
  // stored in this.state.svPath.
  focusPath: string[];
  // A map from stat var dcid to its path in the hierarchy.
  svPath: Record<string, string[]>;
  // Error message.
  errorMessage: string;
  // Indicates when search input was cleared after a result was selected.
  searchSelectionCleared: boolean;
  // Select or de-select a stat var with its path.
  togglePath: (sv: string, path?: string[]) => void;
}

export class StatVarHierarchy extends React.Component<
  StatVarHierarchyPropType,
  StatVarHierarchyStateType
> {
  // A map from stat var group dcid to the metadata.
  svgInfo: { [svgId: string]: StatVarGroupNodeType };
  // A map from stat var dcid to the metadata.
  svInfo: { [svId: string]: StatVarNodeType };
  // The stat var (group) from search result. The hierarchy focuses on it by
  // displaying the path from root to it.

  constructor(props: StatVarHierarchyPropType) {
    super(props);
    this.state = {
      errorMessage: "",
      focus: "",
      focusPath: [],
      searchSelectionCleared: false,
      svPath: null,
      togglePath: this.togglePath,
    };
    this.svInfo = {};
    this.svgInfo = {};
    this.onSearchSelectionChange = this.onSearchSelectionChange.bind(this);
    this.togglePath = this.togglePath.bind(this);
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(): void {
    if (this.state.searchSelectionCleared) {
      this.setState({ searchSelectionCleared: false });
    }
  }

  render(): JSX.Element {
    if (this.state.searchSelectionCleared) {
      // return null when selected search result gets cleared so the stat var
      // hierarchy sections can be reset by removing all the sections and then
      // rendering them again after the componentDidUpdate hook.
      return null;
    }
    // TODO(shifucun): this should be obtained from the root of root.
    const rootSVGs = Object.keys(this.svgInfo).filter(
      (svgId) => !("parent" in this.svgInfo[svgId])
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
        {!_.isEmpty(this.svInfo) && (
          <div className="stat-var-hierarchy-container card">
            <StatVarHierarchySearch
              statVarGroupsData={this.svgInfo}
              statVarsData={this.svInfo}
              onSelectionChange={this.onSearchSelectionChange}
            />
            <div className="hierarchy-section">
              {rootSVGs.map((svgId) => {
                if (
                  _.isEmpty(this.state.focus) ||
                  this.state.focusPath[0] === svgId
                ) {
                  return (
                    // Each SVG node has a context of the svPath from the state.
                    // This way, a deep node down the tree is able to update
                    // the svPath as a context.
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
                        data={this.svgInfo}
                        pathToSelection={this.state.focusPath.slice(1)}
                        isSelected={this.state.focusPath.length === 1}
                        startsOpened={this.state.focusPath[0] === svgId}
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
        this.svgInfo = svgInfo;
        this.svInfo = svInfo;
        const svPath = {};
        if (this.props.svs) {
          for (const sv of this.props.svs) {
            svPath[sv] = this.getPath(sv);
          }
        }
        this.setState({
          svPath,
        });
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
    const searchSelectionCleared =
      !_.isEmpty(this.state.focusPath) && _.isEmpty(path);
    this.setState({
      focus: selection,
      focusPath: path,
      searchSelectionCleared,
    });
    // If selection is stat var, added it to svPath.
    if (selection != "" && !selection.startsWith("dc/g")) {
      this.setState({
        svPath: Object.assign({ [selection]: path }, this.state.svPath),
      });
    }
  }

  // Add or remove a stat var and its path from the state.
  private togglePath(sv: string, path?: string[]): void {
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

  // Get the path of a stat var from the hierarchy.
  private getPath(sv: string): string[] {
    if (sv == "") {
      return [];
    }
    const path = [];
    path.push(sv);
    let parent = null;
    if (sv in this.svInfo) {
      parent = this.svInfo[sv].parent;
    } else if (sv in this.svgInfo) {
      parent = this.svgInfo[sv].parent;
    }
    while (parent) {
      path.unshift(parent);
      parent = this.svgInfo[parent].parent;
    }
    return path;
  }
}
