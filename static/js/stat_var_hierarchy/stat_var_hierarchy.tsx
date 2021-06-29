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

import { StatVarHierarchySearch } from "./stat_var_search";
import { StatVarGroupNode } from "./stat_var_group_node";
import {
  NamedPlace,
  StatVarGroupInfo,
  StatVarHierarchyType,
} from "../shared/types";

import { loadSpinner, removeSpinner } from "../browser/util";
import { Context } from "../shared/context";

const LOADING_CONTAINER_ID = "stat-var-hierarchy-section";
const SORTED_FIRST_SVG_ID = "dc/g/Demographics";
const SORTED_LAST_SVG_ID = "dc/g/Miscellaneous";
const ROOT_SVG = "dc/g/Root";

interface StatVarHierarchyPropType {
  type: string;
  places: NamedPlace[];
  // (Optional) A list of stat vars selected from parent componenet.
  // For example, in timeline tool, these are stat vars parsed from URL.
  selectedSVs?: string[];
  // Callback function when a stat var is selected
  selectSV?: (sv: string) => void;
  // Callback function when a stat var is deselected
  deselectSV?: (sv: string) => void;
  // Optional label to add above the search box
  searchLabel?: string;
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
  // A list of stat var group nodes.
  rootSVGs: StatVarGroupInfo[];
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
      focus: "",
      focusPath: [],
      searchSelectionCleared: false,
      svPath: null,
      rootSVGs: [],
      togglePath: this.togglePath,
    };
    this.onSearchSelectionChange = this.onSearchSelectionChange.bind(this);
    this.togglePath = this.togglePath.bind(this);
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(prevProps: StatVarHierarchyPropType): void {
    if (this.state.searchSelectionCleared) {
      this.setState({ searchSelectionCleared: false });
    }
    if (this.props.places !== prevProps.places) {
      this.fetchData();
    }
  }

  render(): JSX.Element {
    if (this.state.searchSelectionCleared) {
      // return null when selected search result gets cleared so the stat var
      // hierarchy sections can be reset by removing all the sections and then
      // rendering them again after the componentDidUpdate hook.
      return null;
    }
    // Do not want to change the state here.
    const rootSVGs = _.cloneDeep(this.state.rootSVGs);
    if (!_.isEmpty(rootSVGs)) {
      rootSVGs.sort((a, b) => {
        if (a.id === SORTED_FIRST_SVG_ID) {
          return -1;
        }
        if (b.id === SORTED_FIRST_SVG_ID) {
          return 1;
        }
        if (a.id === SORTED_LAST_SVG_ID) {
          return 1;
        }
        if (b.id === SORTED_LAST_SVG_ID) {
          return -1;
        }
        return a > b ? 1 : -1;
      });
    }
    return (
      <div id={LOADING_CONTAINER_ID} className="loading-spinner-container">
        {!_.isEmpty(this.state.errorMessage) && (
          <div className="error-message">{this.state.errorMessage}</div>
        )}
        {!_.isEmpty(rootSVGs) && (
          <div className="stat-var-hierarchy-container">
            <StatVarHierarchySearch
              places={this.props.places.map((x) => x.dcid)}
              onSelectionChange={this.onSearchSelectionChange}
              searchLabel={this.props.searchLabel}
            />
            <div id="stat-var-hierarchy-scroll-container">
              <div id="hierarchy-section">
                {rootSVGs.map((svg) => {
                  if (
                    _.isEmpty(this.state.focus) ||
                    this.state.focusPath[0] === svg.id
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
                        key={svg.id}
                      >
                        <StatVarGroupNode
                          path={[svg.id]}
                          places={this.props.places}
                          data={svg}
                          pathToSelection={this.state.focusPath.slice(1)}
                          isSelected={this.state.focusPath.length === 1}
                          startsOpened={this.state.focusPath[0] === svg.id}
                        />
                      </Context.Provider>
                    );
                  }
                }, this)}
              </div>
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
    let url = `/api/browser/statvar/group?stat_var_group=${ROOT_SVG}`;
    for (const place of this.props.places) {
      url += `&places=${place.dcid}`;
    }
    const allPromises: Promise<string[] | StatVarGroupInfo[]>[] = [];
    allPromises.push(
      axios.get(url).then((resp) => {
        return resp.data["childStatVarGroups"];
      })
    );
    if (this.props.selectedSVs) {
      for (const sv of this.props.selectedSVs) {
        allPromises.push(this.getPath(sv));
      }
    }
    Promise.all(allPromises)
      .then((allResult) => {
        removeSpinner(LOADING_CONTAINER_ID);
        const rootSVGs = allResult[0] as StatVarGroupInfo[];
        const paths = allResult.slice(1) as string[][];
        const svPath = {};
        for (const path of paths) {
          // In this case, the stat var is not in hierarchy.
          if (path.length == 1) {
            continue;
          }
          svPath[path.slice(-1)[0]] = path;
        }
        this.setState({
          rootSVGs,
          svPath,
        });
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieving stat var group root nodes",
        });
      });
  }

  private onSearchSelectionChange(selection: string): void {
    this.getPath(selection).then((path) => {
      const searchSelectionCleared =
        !_.isEmpty(this.state.focusPath) && _.isEmpty(path);
      this.setState({
        focus: selection,
        focusPath: path,
        searchSelectionCleared,
      });
      // If selection is stat var, added it to svPath.
      if (selection != "" && !selection.startsWith("dc/g")) {
        if (this.props.selectSV) {
          this.props.selectSV(selection);
        }
        this.setState({
          svPath: Object.assign({ [selection]: path }, this.state.svPath),
        });
      }
    });
  }

  // Add or remove a stat var and its path from the state.
  private togglePath(sv: string, path?: string[]): void {
    if (sv in this.state.svPath) {
      const tmp = _.cloneDeep(this.state.svPath);
      delete tmp[sv];
      if (this.props.deselectSV) {
        this.props.deselectSV(sv);
      }
      this.setState({ svPath: tmp });
    } else {
      if (this.props.selectSV) {
        this.props.selectSV(sv);
      }
      const svPath =
        this.props.type === StatVarHierarchyType.MAP
          ? { [sv]: path }
          : Object.assign({ [sv]: path }, this.state.svPath);
      this.setState({
        svPath,
      });
    }
  }

  // Get the path of a stat var from the hierarchy.
  private getPath(sv: string): Promise<string[]> {
    if (sv == "") {
      return Promise.resolve([]);
    }
    return axios
      .get(`/api/browser/statvar/path?id=${encodeURIComponent(sv)}`)
      .then((resp) => {
        // This is to make jest test working, should find a better way to let
        // mock return new object each time.
        return _.cloneDeep(resp.data["path"]).reverse();
      });
  }
}
