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
 * Component for rendering a stat var group node in the stat var hierarchy
 */

import axios from "axios";
import _ from "lodash";
import React from "react";
import Collapsible from "react-collapsible";

import { Context, ContextType } from "../shared/context";
import {
  RADIO_BUTTON_TYPES,
  StatVarGroupInfo,
  StatVarHierarchyNodeType,
  StatVarHierarchyType,
  StatVarInfo,
} from "../shared/types";
import { NamedNode } from "../shared/types";
import { StatVarHierarchyNodeHeader } from "./node_header";
import { StatVarGroupSection } from "./stat_var_group_section";
import { StatVarSection } from "./stat_var_section";

const SCROLL_DELAY = 400;
// Stat var hierarchy types where nodes containing selected SV should be
// expanded on initial render of the page.
const INITIAL_EXPANSION_TYPES = [
  ...Array.from(RADIO_BUTTON_TYPES),
  StatVarHierarchyType.BROWSER,
];

interface StatVarGroupNodePropType {
  // The path of this stat var group node.
  path: string[];
  // A list of named node objects.
  entities: NamedNode[];
  // The information for the stat var group node.
  data: StatVarGroupInfo;
  // if a statvar or statvar group has been selected, the path of stat var
  // groups from root to selected stat var group or stat var
  pathToSelection: string[];
  // whether the current component has been selected and should be highlighted
  isSelected: boolean;
  // whether the current component should be opened when rendered
  startsOpened: boolean;
  // whether we should show all stat vars, even the ones without data.
  showAllSV: boolean;
  // path of svgs that should be expanded.
  expandedPath: string[];
  // Number of entities that should have data for each stat var (group) shown
  numEntitiesExistence?: number;
}

interface StatVarGroupNodeStateType {
  // whether this node should be open.
  isOpen: boolean;
  // A list of child stat var group nodes.
  childSVG: StatVarGroupInfo[];
  // A list of child stat var nodes.
  childSV: StatVarInfo[];
  // Error message when failed to render this component.
  errorMessage: string;
  // Whether the next level of information is fetched.
  dataFetchedEntities: NamedNode[];
  // Number of SVs under this stat var group node has been selected.
  selectionCount: number;
}

export class StatVarGroupNode extends React.Component<
  StatVarGroupNodePropType,
  StatVarGroupNodeStateType
> {
  highlightedStatVar: React.RefObject<HTMLDivElement>;
  delayTimer: NodeJS.Timeout;
  context: ContextType;
  // the list of entities for which data fetch has begun, but not finished.
  dataFetchingEntities: NamedNode[];

  constructor(props: StatVarGroupNodePropType) {
    super(props);
    this.state = {
      isOpen: this.props.startsOpened,
      childSVG: [],
      childSV: [],
      errorMessage: "",
      dataFetchedEntities: null,
      selectionCount: 0,
    };
    this.highlightedStatVar = React.createRef();
    this.dataFetchingEntities = null;
    this.scrollToHighlighted = this.scrollToHighlighted.bind(this);
    this.fetchData = this.fetchData.bind(this);
  }

  componentDidMount(): void {
    this.fetchDataIfNecessary();
    const selectionCount = this.getSelectionCount();
    if (selectionCount > 0) {
      this.setState({
        selectionCount,
        isOpen: INITIAL_EXPANSION_TYPES.includes(
          this.context.statVarHierarchyType
        ),
      });
    }
  }

  componentDidUpdate(prevProps: StatVarGroupNodePropType): void {
    const newSelectionCount = this.getSelectionCount();
    const newState = { ...this.state };
    newState.selectionCount = newSelectionCount;
    newState.isOpen = this.getIsNodeOpen(prevProps, newSelectionCount);
    if (!_.isEqual(this.state, newState)) {
      this.setState(newState);
    }
    this.fetchDataIfNecessary();
    this.scrollToHighlighted();
  }

  fetchDataIfNecessary(): void {
    // Check if data for current list of entities is being fetched or has already
    // finished fetching. If so, don't fetch again.
    const entitiesFetched =
      _.isEqual(this.state.dataFetchedEntities, this.props.entities) ||
      _.isEqual(this.dataFetchingEntities, this.props.entities);
    if (this.state.isOpen && !entitiesFetched) {
      this.fetchData();
    }
  }

  getSelectionCount(): number {
    let count = 0;
    const level = this.props.path.length;
    for (const sv in this.context.svPath) {
      const path = this.context.svPath[sv];
      if (_.isEqual(path.slice(0, level), this.props.path)) {
        count += 1;
      }
    }
    return count;
  }

  render(): JSX.Element {
    let triggerTitle = this.props.data.specializedEntity
      ? this.props.data.specializedEntity
      : this.props.data.displayName;
    if (this.props.data.id === "dc/g/Private") {
      triggerTitle = `[${triggerTitle}]`;
    }

    const level = this.props.path.length;
    const svgOnSvPath = new Set();
    for (const sv in this.context.svPath) {
      const path = this.context.svPath[sv];
      if (level < path.length) {
        svgOnSvPath.add(path[level]);
      }
    }
    const childSV = this.props.showAllSV
      ? this.state.childSV
      : this.state.childSV.filter(
          (sv) => sv.hasData || sv.id in this.context.svPath
        );
    const childSVG = this.props.showAllSV
      ? this.state.childSVG
      : this.state.childSVG.filter((svg) => {
          return svg.descendentStatVarCount > 0 || svgOnSvPath.has(svg.id);
        });
    const getTrigger = (opened: boolean) => {
      return React.createElement(StatVarHierarchyNodeHeader, {
        childrenStatVarCount: this.props.data.descendentStatVarCount,
        highlighted: this.props.isSelected,
        nodeType: StatVarHierarchyNodeType.STAT_VAR_GROUP,
        opened,
        selectionCount: this.state.selectionCount,
        title: triggerTitle,
        showTooltip: this.props.path.length > 1,
      });
    };
    return (
      <>
        {!_.isEmpty(this.state.errorMessage) && (
          <div className="error-message">{this.state.errorMessage}</div>
        )}
        <Collapsible
          trigger={getTrigger(false)}
          triggerWhenOpen={getTrigger(true)}
          open={this.state.isOpen && !_.isNull(this.state.dataFetchedEntities)}
          handleTriggerClick={() => {
            this.setState({ isOpen: !this.state.isOpen });
          }}
          transitionTime={200}
          onOpen={this.scrollToHighlighted}
          containerElementProps={
            this.props.isSelected
              ? { className: "highlighted-stat-var-group" }
              : {}
          }
        >
          <>
            {this.props.pathToSelection.length < 2 &&
              !_.isEmpty(this.state.childSV) && (
                <StatVarSection
                  path={this.props.path}
                  data={childSV}
                  pathToSelection={this.props.pathToSelection}
                  entities={this.props.entities}
                  highlightedStatVar={this.highlightedStatVar}
                />
              )}
            {!_.isEmpty(this.state.childSVG) && (
              <StatVarGroupSection
                path={this.props.path}
                data={childSVG}
                pathToSelection={this.props.pathToSelection}
                highlightedStatVar={this.highlightedStatVar}
                entities={this.props.entities}
                showAllSV={this.props.showAllSV}
                expandedPath={this.props.expandedPath}
                numEntitiesExistence={this.props.numEntitiesExistence}
              />
            )}
          </>
        </Collapsible>
      </>
    );
  }

  private fetchData(): void {
    // stat var (group) dcid can contain [/_-.&], need to encode here.
    // Example: dc/g/Person_Citizenship-NotAUSCitizen_CorrectionalFacilityOperator-StateOperated&FederallyOperated&PrivatelyOperated
    let url = `/api/variable-group/info?dcid=${encodeURIComponent(
      this.props.data.id
    )}`;
    const entityList = this.props.entities;
    for (const entity of entityList) {
      url += `&entities=${entity.dcid}`;
    }
    if (this.props.numEntitiesExistence) {
      url += `&numEntitiesExistence=${this.props.numEntitiesExistence}`;
    }
    this.dataFetchingEntities = entityList;
    axios
      .get(url)
      .then((resp) => {
        const data = resp.data;
        const childSV: StatVarInfo[] = data["childStatVars"] || [];
        const childSVG: StatVarGroupInfo[] = data["childStatVarGroups"] || [];
        this.dataFetchingEntities = null;
        if (_.isEqual(entityList, this.props.entities)) {
          this.setState({
            childSV,
            childSVG,
            dataFetchedEntities: entityList,
          });
        }
      })
      .catch(() => {
        this.dataFetchingEntities = null;
        if (_.isEqual(entityList, this.props.entities)) {
          this.setState({
            errorMessage: "Error retrieving stat var group children",
            dataFetchedEntities: entityList,
          });
        }
      });
  }

  private scrollToHighlighted(): void {
    clearTimeout(this.delayTimer);
    this.delayTimer = setTimeout(() => {
      if (this.highlightedStatVar.current !== null) {
        const rect = this.highlightedStatVar.current.getBoundingClientRect();
        if (rect.top < 0 || rect.top > window.innerHeight) {
          this.highlightedStatVar.current.scrollIntoView({
            behavior: "smooth",
          });
        }
      }
    }, SCROLL_DELAY);
  }

  private getIsNodeOpen(
    prevProps: StatVarGroupNodePropType,
    newSelectionCount: number
  ): boolean {
    // A parent component may open a node when either the selection path or
    // expanded path has changed.
    const openedByParent =
      (!_.isEqual(prevProps.pathToSelection, this.props.pathToSelection) ||
        !_.isEqual(prevProps.expandedPath, this.props.expandedPath)) &&
      this.props.startsOpened;
    // If this is a stat var hierarchy that wants the path to the selected
    // statistical variable expanded, then if the selection count for this node
    // increases, we want to open this node
    const openedByNewSelection =
      INITIAL_EXPANSION_TYPES.includes(this.context.statVarHierarchyType) &&
      newSelectionCount > this.state.selectionCount;
    // If this node is already open, keep it open
    return openedByParent || openedByNewSelection || this.state.isOpen;
  }
}

StatVarGroupNode.contextType = Context;
