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
} from "./types";
import { StatVarHierarchyNodeHeader } from "./statvar_hierarchy_node_header";
import { StatVarSection } from "./statvar_section";
import { StatVarGroupSection } from "./statvar_group_section";
import { Node } from "../shared/types";

import { Context, ContextType } from "../shared/context";

const SCROLL_DELAY = 400;

interface StatVarGroupNodePropType {
  // The path of this stat var group node.
  path: string[];
  // A list of named places object.
  places: Node[];
  // the mapping of all stat var groups to their corresponding information
  data: StatVarGroupInfo;
  // if a statvar or statvar group has been selected, the path of stat var
  // groups from root to selected stat var group or stat var
  pathToSelection: string[];
  // whether the current component has been selected and should be highlighted
  isSelected: boolean;
  // whether the current component should be opened when rendered
  startsOpened: boolean;
}

interface StatVarGroupNodeStateType {
  // whether user has manually expanded this node. If this node has been toggled
  // open, we want to render an expanded collapsible by passing in true for the
  // open prop.
  toggledOpen: boolean;
  childSVG: StatVarGroupInfo[];
  childSV: StatVarInfo[];
  errorMessage: string;
}

export class StatVarGroupNode extends React.Component<
  StatVarGroupNodePropType,
  StatVarGroupNodeStateType
> {
  highlightedStatVar: React.RefObject<HTMLDivElement>;
  delayTimer: NodeJS.Timeout;
  context: ContextType;
  hasData: boolean;

  constructor(props: StatVarGroupNodePropType) {
    super(props);
    this.state = {
      toggledOpen: false,
      childSVG: [],
      childSV: [],
      errorMessage: "",
    };
    this.highlightedStatVar = React.createRef();
    this.scrollToHighlighted = this.scrollToHighlighted.bind(this);
    this.fetchData = this.fetchData.bind(this);
    this.hasData = false;
  }

  componentDidMount(): void {
    this.scrollToHighlighted();
  }

  render(): JSX.Element {
    console.log(this.props);
    console.log(this.state);

    const triggerTitle = this.props.data.specializedEntity
      ? this.props.data.specializedEntity
      : this.props.data.displayName;

    const level = this.props.path.length;
    let count = 0;
    for (const sv in this.context.svPath) {
      const path = this.context.svPath[sv];
      if (_.isEqual(path.slice(0, level), this.props.path)) {
        count += 1;
      }
    }

    const getTrigger = (opened: boolean) => {
      return React.createElement(StatVarHierarchyNodeHeader, {
        count: count,
        highlighted: this.props.isSelected,
        nodeType: StatVarHierarchyNodeType.STAT_VAR_GROUP,
        opened,
        title: triggerTitle,
      });
    };
    return (
      <Collapsible
        trigger={getTrigger(false)}
        triggerWhenOpen={getTrigger(true)}
        open={this.props.startsOpened || this.state.toggledOpen}
        handleTriggerClick={() => {
          this.setState({ toggledOpen: !this.state.toggledOpen });
        }}
        onOpening={this.fetchData}
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
                data={this.state.childSV}
                pathToSelection={this.props.pathToSelection}
                places={this.props.places}
                highlightedStatVar={this.highlightedStatVar}
              />
            )}
            {this.state.childSVG && (
              <StatVarGroupSection
                path={this.props.path}
                data={this.state.childSVG}
                pathToSelection={this.props.pathToSelection}
                highlightedStatVar={this.highlightedStatVar}
                places={this.props.places}
              />
            )}
          </>
        )}
      </Collapsible>
    );
  }

  private fetchData(): void {
    if (this.hasData) {
      return;
    }
    let url = `/api/browser/statvar/group?stat_var_group=${this.props.data.id}`;
    for (const place of this.props.places) {
      url += `&places=${place.dcid}`;
    }
    axios
      .get(url)
      .then((resp) => {
        const data = resp.data;
        this.setState({
          childSV: data["childStatVars"],
          childSVG: data["childStatVarGroups"],
        });
        this.hasData = true;
      })
      .catch(() => {
        this.setState({
          errorMessage: "Error retrieving stat var group children",
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
