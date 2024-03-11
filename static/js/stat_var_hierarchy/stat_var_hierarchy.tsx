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

import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React from "react";

import { Context } from "../shared/context";
import {
  GA_EVENT_TOOL_STAT_VAR_CLICK,
  GA_PARAM_STAT_VAR,
  triggerGAEvent,
} from "../shared/ga_events";
import {
  NamedNode,
  RADIO_BUTTON_TYPES,
  StatVarGroupInfo,
  StatVarGroupNodeType,
  StatVarHierarchyType,
} from "../shared/types";
import { loadSpinner, removeSpinner } from "../shared/util";
import { STAT_VAR_HIERARCHY_CONFIG } from "../tools/stat_var/stat_var_hierarchy_config";
import { StatVarGroupNode } from "./stat_var_group_node";
import { StatVarHierarchySearch } from "./stat_var_search";
import {
  hideTooltip,
  showTooltip,
  SV_HIERARCHY_SECTION_ID,
  TOOLTIP_ID,
} from "./util";

const TOOLTIP_TOP_OFFSET = 30;
const TOOLTIP_MARGIN = 5;
export interface StatVarHierarchyPropType {
  type: string;
  entities: NamedNode[];
  hidden?: boolean;
  // (Optional) A list of stat vars selected from parent component.
  // For example, in timeline tool, these are stat vars parsed from URL.
  selectedSVs?: string[];
  // Callback function when a stat var is selected
  selectSV?: (sv: string) => void;
  // Callback function when a stat var is deselected
  deselectSV?: (sv: string) => void;
  // Optional label to add above the search box
  searchLabel?: string;
  // Number of entities that should have data for each stat var (group) shown
  numEntitiesExistence?: number;
}

type StatVarGroupInfoConfig = StatVarGroupInfo & {
  // Optional: add data source DCID to filter stat var group variables
  dataSourceDcid?: string;
};

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
  // A path of svgs which should be expanded
  expandedPath: string[];
  // A list of stat var group nodes.
  rootSVGs: StatVarGroupInfoConfig[];
  // Select or de-select a stat var with its path.
  togglePath: (sv: string, path?: string[]) => void;
  // Whether we should show all stat vars, even the ones without data.
  showAllSV: boolean;
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
      expandedPath: [],
      svPath: null,
      rootSVGs: [],
      togglePath: this.togglePath,
      showAllSV: false,
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
    if (
      !_.isEqual(this.props.entities, prevProps.entities) ||
      !_.isEqual(this.props.selectedSVs, prevProps.selectedSVs)
    ) {
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
    let rootSVGs = this.state.rootSVGs;
    if (!this.state.showAllSV) {
      const svgOnSvPath = new Set();
      for (const sv in this.state.svPath) {
        svgOnSvPath.add(this.state.svPath[sv][0]);
      }
      rootSVGs = rootSVGs.filter(
        (svg) => svg.descendentStatVarCount > 0 || svgOnSvPath.has(svg.id)
      );
    }
    return (
      <div
        id={SV_HIERARCHY_SECTION_ID}
        className={`loading-spinner-container ${
          this.props.hidden ? "hidden" : ""
        }`}
      >
        {!_.isEmpty(this.state.errorMessage) && (
          <div className="error-message">{this.state.errorMessage}</div>
        )}
        <div className="stat-var-hierarchy-container">
          {/* If svgRoot is set, only show subset of stat vars, so disable search */}
          {!STAT_VAR_HIERARCHY_CONFIG.disableSearch && (
            <StatVarHierarchySearch
              entities={this.props.entities.map((x) => x.dcid)}
              onSelectionChange={this.onSearchSelectionChange}
              searchLabel={this.props.searchLabel}
            />
          )}
          {this.props.type !== StatVarHierarchyType.BROWSER &&
            this.props.type !== StatVarHierarchyType.STAT_VAR && (
              <div className="stat-var-hierarchy-options">
                <div className="show-sv-toggle">
                  <i
                    className={`material-icons-outlined ${
                      this.state.showAllSV ? "toggle-on" : "toggle-off"
                    }`}
                    onClick={() =>
                      this.setState({ showAllSV: !this.state.showAllSV })
                    }
                  >
                    {this.state.showAllSV ? "toggle_on" : "toggle_off"}
                  </i>
                  Show all statistical variables
                </div>
                <div id="tree-widget-info">
                  <i
                    onMouseOver={this.onMouseOverInfoIcon}
                    onMouseOut={() => hideTooltip()}
                    className="material-icons-outlined"
                  >
                    info
                  </i>
                </div>
              </div>
            )}
          {!_.isEmpty(rootSVGs) ? (
            <div id="stat-var-hierarchy-scroll-container">
              <div id="hierarchy-section">
                {rootSVGs.map((svg, index) => {
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
                        key={`${svg.id}-${index}`}
                      >
                        <StatVarGroupNode
                          path={[svg.id]}
                          entities={this.props.entities}
                          data={svg}
                          pathToSelection={this.state.focusPath.slice(1)}
                          isSelected={this.state.focusPath.length === 1}
                          startsOpened={
                            this.state.focusPath[0] === svg.id ||
                            this.state.expandedPath[0] === svg.id
                          }
                          showAllSV={this.state.showAllSV}
                          expandedPath={this.state.expandedPath.slice(1)}
                          numEntitiesExistence={this.props.numEntitiesExistence}
                          dataSource={
                            // This is a virtual node for holding stat vars of
                            // a data source.
                            // Add data source to constrain this node.
                            svg.dataSourceDcid
                          }
                        />
                      </Context.Provider>
                    );
                  }
                }, this)}
              </div>
            </div>
          ) : (
            <div className="no-sv-message">
              No Available Statistical Variables
            </div>
          )}
        </div>
        <div id="browser-screen" className="screen">
          <div id="spinner"></div>
        </div>
        <div id={TOOLTIP_ID}></div>
      </div>
    );
  }

  private async fetchData(): Promise<void> {
    loadSpinner(SV_HIERARCHY_SECTION_ID);
    const entityList = this.props.entities.map((entity) => entity.dcid);
    const variableGroupInfoPromises: Promise<StatVarGroupNodeType>[] =
      STAT_VAR_HIERARCHY_CONFIG.nodes.map((statVarHierarchyConfigNode) => {
        // Filter variable group info result with these data source DCIDs
        // if specified
        const dataSourceEntities = statVarHierarchyConfigNode.dataSourceDcid
          ? [statVarHierarchyConfigNode.dataSourceDcid]
          : [];
        return axios
          .post("/api/variable-group/info", {
            dcid: statVarHierarchyConfigNode.dcid,
            entities: [...entityList, ...dataSourceEntities],
            numEntitiesExistence: this.props.numEntitiesExistence,
          })
          .then((resp) => {
            return resp.data;
          });
      });
    const statVarPathPromises: Promise<string[]>[] = [];
    const svPath = {};
    if (this.props.selectedSVs) {
      for (const sv of this.props.selectedSVs) {
        if (this.state.svPath && sv in this.state.svPath) {
          svPath[sv] = this.state.svPath[sv];
        } else {
          statVarPathPromises.push(this.getPath(sv));
        }
      }
    }

    try {
      const variableGroupInfos = await Promise.all(variableGroupInfoPromises);
      // const dataSourceFilter = await dataSourceFilterPromise;
      const statVarFilterPaths = await Promise.all(statVarPathPromises);
      removeSpinner(SV_HIERARCHY_SECTION_ID);

      // Set root stat var group hierarchy
      const rootSVGs: StatVarGroupInfoConfig[] = [];
      // Don't display the root node if there's only one stat var root node
      // (e.g., "dc/g/Root"). Instead, show child stat var groups at the top
      // level.
      if (variableGroupInfos.length === 1) {
        rootSVGs.push(...(variableGroupInfos[0].childStatVarGroups || []));
      } else {
        variableGroupInfos.forEach((variableGroupInfo, index) => {
          const statVarHierarchyNodeConfig =
            STAT_VAR_HIERARCHY_CONFIG.nodes[index];
          rootSVGs.push({
            id: statVarHierarchyNodeConfig.dcid,
            specializedEntity: "",
            displayName:
              statVarHierarchyNodeConfig.name || variableGroupInfo.absoluteName,
            descendentStatVarCount: variableGroupInfo.descendentStatVarCount,
            dataSourceDcid: statVarHierarchyNodeConfig.dataSourceDcid,
          });
        });
      }

      // Set stat var path filters
      for (const path of statVarFilterPaths) {
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
    } catch {
      removeSpinner(SV_HIERARCHY_SECTION_ID);
      this.setState({
        errorMessage: "Error retrieving stat var group root nodes",
      });
    }
  }

  private onSearchSelectionChange(selection: string): void {
    this.getPath(selection).then((path) => {
      const searchSelectionCleared =
        !_.isEmpty(this.state.focusPath) && _.isEmpty(path);
      this.setState({
        focus: selection,
        focusPath: path,
        searchSelectionCleared,
        expandedPath: searchSelectionCleared ? this.state.focusPath : [],
      });
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
        triggerGAEvent(GA_EVENT_TOOL_STAT_VAR_CLICK, {
          [GA_PARAM_STAT_VAR]: sv,
        });
      }
      const svPath = RADIO_BUTTON_TYPES.has(this.props.type)
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
      .get(`/api/variable/path?dcid=${encodeURIComponent(sv)}`)
      .then((resp) => {
        // This is to make jest test working, should find a better way to let
        // mock return new object each time.
        return _.cloneDeep(resp.data).reverse();
      });
  }

  private onMouseOverInfoIcon = () => {
    const html =
      "<ul><li>The number in parentheses represents the number of stat vars " +
      "within the group where we have data for the chosen place(s).</li>" +
      "<li>Greyed out groups and statistical variables have no available data " +
      "for the chosen place(s). You can choose to hide these by using the " +
      '"Show all statistical variables toggle".</li></ul>';
    const containerY = (
      d3.select("#explore").node() as HTMLElement
    ).getBoundingClientRect().y;
    const iconY = (
      d3.select("#tree-widget-info i").node() as HTMLElement
    ).getBoundingClientRect().y;
    showTooltip(html, {
      left: TOOLTIP_MARGIN,
      top: iconY - containerY + TOOLTIP_TOP_OFFSET,
    });
  };
}
