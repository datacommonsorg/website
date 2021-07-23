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

import React from "react";
import axios from "axios";
import Collapsible from "react-collapsible";
import _ from "lodash";

import {
  StatVarInfo,
  StatVarGroupInfo,
  StatVarHierarchyNodeType,
  StatVarHierarchyType,
} from "../shared/types";
import { StatVarHierarchyNodeHeader } from "./node_header";
import { StatVarSection } from "./stat_var_section";
import { StatVarGroupSection } from "./stat_var_group_section";
import { NamedPlace } from "../shared/types";

import { Context, ContextType } from "../shared/context";

const SCROLL_DELAY = 400;

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
}

export class StatVarGroupNode extends React.Component<
  StatVarGroupNodePropType,
  StatVarGroupNodeStateType
> {
  highlightedStatVar: React.RefObject<HTMLDivElement>;
  delayTimer: NodeJS.Timeout;
  context: ContextType;
  hasData: boolean;
  selectionCount: number;

  constructor(props: StatVarGroupNodePropType) {
    super(props);
    this.state = {
      toggledOpen: false,
      childSVG: [],
      childSV: [],
      errorMessage: "",
      dataFetchedPlaces: null,
    };
    this.highlightedStatVar = React.createRef();
    this.scrollToHighlighted = this.scrollToHighlighted.bind(this);
    this.fetchData = this.fetchData.bind(this);
  }

  componentDidMount(): void {
    this.fetchDataIfNecessary();
    if (
      this.context.statVarHierarchyType == StatVarHierarchyType.BROWSER &&
      this.selectionCount > 0
    ) {
      this.setState({ toggledOpen: true });
    }
  }

  componentDidUpdate(): void {
    this.fetchDataIfNecessary();
    this.scrollToHighlighted();
  }

  fetchDataIfNecessary(): void {
    if (
      (this.props.startsOpened || this.state.toggledOpen) &&
      !_.isEqual(this.state.dataFetchedPlaces, this.props.places)
    ) {
      this.fetchData();
    }
  }

  render(): JSX.Element {
    const triggerTitle = this.props.data.specializedEntity
      ? this.props.data.specializedEntity
      : this.props.data.displayName;

    const level = this.props.path.length;
    this.selectionCount = 0;
    for (const sv in this.context.svPath) {
      const path = this.context.svPath[sv];
      if (_.isEqual(path.slice(0, level), this.props.path)) {
        this.selectionCount += 1;
      }
    }
    const childSV = this.props.showAllSV
      ? this.state.childSV
      : this.state.childSV.filter((sv) => sv.hasData);
    const childSVG = this.props.showAllSV
      ? this.state.childSVG
      : this.state.childSVG.filter((svg) => svg.numDescendentStatVars > 0);
    const getTrigger = (opened: boolean) => {
      return React.createElement(StatVarHierarchyNodeHeader, {
        childrenStatVarCount: this.props.data.numDescendentStatVars,
        highlighted: this.props.isSelected,
        nodeType: StatVarHierarchyNodeType.STAT_VAR_GROUP,
        opened,
        selectionCount: this.selectionCount,
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
          {(this.props.startsOpened || this.state.toggledOpen) && (
            <>
              {this.props.pathToSelection.length < 2 && this.state.childSV && (
                <StatVarSection
                  path={this.props.path}
                  data={childSV}
                  pathToSelection={this.props.pathToSelection}
                  places={this.props.places}
                  highlightedStatVar={this.highlightedStatVar}
                />
              )}
              {this.state.childSVG && (
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
          )}
        </Collapsible>
      </>
    );
  }

  private fetchData(): void {
    // stat var (group) dcid can contain [/_-.&], need to encode here.
    // Example: dc/g/Person_Citizenship-NotAUSCitizen_CorrectionalFacilityOperator-StateOperated&FederallyOperated&PrivatelyOperated
    let url = `/api/browser/statvar/group?stat_var_group=${encodeURIComponent(
      this.props.data.id
    )}`;
    const placeList = this.props.places;
    for (const place of placeList) {
      url += `&places=${place.dcid}`;
    }
    axios
      .get(url)
      .then((resp) => {
        const data = resp.data;
        const childSV: StatVarInfo[] = data["childStatVars"] || [];
        const childSVG: StatVarGroupInfo[] = data["childStatVarGroups"] || [];
        this.setState({
          childSV,
          childSVG,
          dataFetchedPlaces: placeList,
        });
      })
      .catch(() => {
        this.setState({
          errorMessage: "Error retrieving stat var group children",
          dataFetchedPlaces: placeList,
        });
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
