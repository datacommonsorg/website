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
  StatVarGroupInfo,
  StatVarHierarchyNodeType,
  StatVarHierarchyType,
  StatVarInfo,
} from "../shared/types";
import { NamedPlace } from "../shared/types";
import { StatVarHierarchyNodeHeader } from "./node_header";
import { StatVarGroupSection } from "./stat_var_group_section";
import { StatVarSection } from "./stat_var_section";

const SCROLL_DELAY = 400;
// Stat var hierarchy types where nodes containing selected SV should be
// expanded on initial render of the page.
const INITIAL_EXPANSION_TYPES = [
  StatVarHierarchyType.BROWSER,
  StatVarHierarchyType.MAP,
];

interface StatVarGroupNodePropType {
  // The path of this stat var group node.
  path: string[];
  // A list of named places object.
  places: NamedPlace[];
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
}

interface StatVarGroupNodeStateType {
  // whether user has manually expanded this node. If this node has been toggled
  // open, we want to render an expanded collapsible by passing in true for the
  // open prop.
  toggledOpen: boolean;
  // A list of child stat var group nodes.
  childSVG: StatVarGroupInfo[];
  // A list of child stat var nodes.
  childSV: StatVarInfo[];
  // Error message when failed to render this componenet.
  errorMessage: string;
  // Whether the next level of information is fetched.
  dataFetchedPlaces: NamedPlace[];
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
  // the list of places for which data fetch has begun, but not finished.
  dataFetchingPlaces: NamedPlace[];

  constructor(props: StatVarGroupNodePropType) {
    super(props);
    this.state = {
      toggledOpen: false,
      childSVG: [],
      childSV: [],
      errorMessage: "",
      dataFetchedPlaces: null,
      selectionCount: 0,
    };
    this.highlightedStatVar = React.createRef();
    this.dataFetchingPlaces = null;
    this.scrollToHighlighted = this.scrollToHighlighted.bind(this);
    this.fetchData = this.fetchData.bind(this);
  }

  componentDidMount(): void {
    this.fetchDataIfNecessary();
    const selectionCount = this.getSelectionCount();
    if (selectionCount > 0) {
      this.setState({
        selectionCount,
        toggledOpen: INITIAL_EXPANSION_TYPES.includes(
          this.context.statVarHierarchyType
        ),
      });
    }
  }

  componentDidUpdate(): void {
    const newSelectionCount = this.getSelectionCount();
    if (newSelectionCount !== this.state.selectionCount) {
      this.setState({
        selectionCount: newSelectionCount,
        toggledOpen:
          this.state.toggledOpen ||
          (INITIAL_EXPANSION_TYPES.includes(
            this.context.statVarHierarchyType
          ) &&
            newSelectionCount > this.state.selectionCount),
      });
    }
    this.fetchDataIfNecessary();
    this.scrollToHighlighted();
  }

  fetchDataIfNecessary(): void {
    // Check if data for current list of places is being fetched or has already
    // finished fetching. If so, don't fetch again.
    const placesFetched =
      _.isEqual(this.state.dataFetchedPlaces, this.props.places) ||
      _.isEqual(this.dataFetchingPlaces, this.props.places);
    if ((this.props.startsOpened || this.state.toggledOpen) && !placesFetched) {
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
          return svg.numDescendentStatVars > 0 || svgOnSvPath.has(svg.id);
        });
    const getTrigger = (opened: boolean) => {
      return React.createElement(StatVarHierarchyNodeHeader, {
        childrenStatVarCount: this.props.data.numDescendentStatVars,
        highlighted: this.props.isSelected,
        nodeType: StatVarHierarchyNodeType.STAT_VAR_GROUP,
        opened,
        selectionCount: this.state.selectionCount,
        title: triggerTitle,
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
          open={
            (this.props.startsOpened || this.state.toggledOpen) &&
            !_.isNull(this.state.dataFetchedPlaces)
          }
          handleTriggerClick={() => {
            this.setState({ toggledOpen: !this.state.toggledOpen });
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
                  places={this.props.places}
                  highlightedStatVar={this.highlightedStatVar}
                />
              )}
            {!_.isEmpty(this.state.childSVG) && (
              <StatVarGroupSection
                path={this.props.path}
                data={childSVG}
                pathToSelection={this.props.pathToSelection}
                highlightedStatVar={this.highlightedStatVar}
                places={this.props.places}
                showAllSV={this.props.showAllSV}
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
    let url = `/api/stats/stat-var-group?stat_var_group=${encodeURIComponent(
      this.props.data.id
    )}`;
    const placeList = this.props.places;
    for (const place of placeList) {
      url += `&places=${place.dcid}`;
    }
    this.dataFetchingPlaces = placeList;
    axios
      .get(url)
      .then((resp) => {
        const data = resp.data;
        const childSV: StatVarInfo[] = data["childStatVars"] || [];
        const childSVG: StatVarGroupInfo[] = data["childStatVarGroups"] || [];
        this.dataFetchingPlaces = null;
        if (_.isEqual(placeList, this.props.places)) {
          this.setState({
            childSV,
            childSVG,
            dataFetchedPlaces: placeList,
          });
        }
      })
      .catch(() => {
        this.dataFetchingPlaces = null;
        if (_.isEqual(placeList, this.props.places)) {
          this.setState({
            errorMessage: "Error retrieving stat var group children",
            dataFetchedPlaces: placeList,
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
}

StatVarGroupNode.contextType = Context;
