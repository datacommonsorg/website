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

import React, { useContext } from "react";
import _ from "lodash";
import Collapsible from "react-collapsible";
import {
  StatVarGroupNodeType,
  StatVarNodeType,
  StatVarHierarchyNodeType,
} from "./types";
import { StatVarNode } from "./statvar_node";
import { StatVarCheckbox } from "./statvar_checkbox";
import { NamedPlace } from "../shared/types";
import { Context, StatVarHierarchyType } from "../shared/context";

const SCROLL_DELAY = 400;
const BULLET_POINT_HTML = <span className="bullet">&#8226;</span>;
const DOWN_ARROW_HTML = <i className="material-icons">remove</i>;
const RIGHT_ARROW_HTML = <i className="material-icons">add</i>;
const VARIABLES_STATVAR_GROUP_PREFIX = "dc/g/Variables_";

interface StatVarGroupNodePropType {
  // A list of named places object.
  places: NamedPlace[];
  // the dcid of the current stat var group
  statVarGroupId: string;
  // the mapping of all stat var groups to their corresponding information
  data: { [key: string]: StatVarGroupNodeType };
  // if a statvar or statvar group has been selected, the path of stat var
  // groups from root to selected stat var group or stat var
  pathToSelection: string[];
  // the specializedEntity string for the current stat var group if there is one
  specializedEntity?: string;
  // whether the current component has been selected and should be highlighted
  isSelected: boolean;
  // whether the current component should be opened when rendered
  open: boolean;
}

interface StatVarGroupNodeStateType {
  isRendered: boolean;
}

export class StatVarGroupNode extends React.Component<
  StatVarGroupNodePropType,
  StatVarGroupNodeStateType
> {
  highlightedStatVar: React.RefObject<HTMLDivElement>;
  delayTimer: NodeJS.Timeout;
  constructor(props: StatVarGroupNodePropType) {
    super(props);
    this.state = {
      isRendered: this.props.open,
    };
    this.highlightedStatVar = React.createRef();
    this.scrollToHighlighted = this.scrollToHighlighted.bind(this);
  }

  componentDidMount(): void {
    this.scrollToHighlighted();
  }

  render(): JSX.Element {
    const statVarGroup = this.props.data[this.props.statVarGroupId];
    const triggerTitle = this.props.specializedEntity
      ? this.props.specializedEntity
      : statVarGroup.absoluteName;
    const getTrigger = (opened: boolean) => {
      return React.createElement(StatVarHierarchyNodeHeader, {
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
        open={this.props.open}
        onOpening={() => this.setState({ isRendered: true })}
        transitionTime={200}
        onOpen={this.scrollToHighlighted}
        containerElementProps={
          this.props.isSelected ? { class: "highlighted-stat-var-group" } : {}
        }
      >
        {this.state.isRendered && (
          <>
            {this.props.pathToSelection.length < 2 &&
              this.props.data[this.props.statVarGroupId].childStatVars && (
                <ChildStatVarSection
                  data={
                    this.props.data[this.props.statVarGroupId].childStatVars
                  }
                  pathToSelection={this.props.pathToSelection}
                  places={this.props.places}
                  highlightedStatVar={this.highlightedStatVar}
                />
              )}
            {this.props.data[this.props.statVarGroupId].childStatVarGroups && (
              <ChildStatVarGroupSection
                data={this.props.data}
                statVarGroupId={this.props.statVarGroupId}
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

interface StatVarHierarchyNodeHeaderPropType {
  title: string;
  opened: boolean;
  highlighted: boolean;
  nodeType: StatVarHierarchyNodeType;
}

export class StatVarHierarchyNodeHeader extends React.Component<
  StatVarHierarchyNodeHeaderPropType
> {
  render(): JSX.Element {
    let prefixHtml =
      this.props.nodeType === StatVarHierarchyNodeType.STAT_VAR
        ? BULLET_POINT_HTML
        : null;
    if (this.props.nodeType === StatVarHierarchyNodeType.STAT_VAR_GROUP) {
      prefixHtml = this.props.opened ? DOWN_ARROW_HTML : RIGHT_ARROW_HTML;
    }
    return (
      <div
        className={
          this.props.highlighted
            ? "highlighted-node-title node-title"
            : "node-title"
        }
      >
        {prefixHtml}
        <span className="title">{this.props.title}</span>
      </div>
    );
  }
}

interface ChildStatVarSectionPropType {
  data: StatVarNodeType[];
  pathToSelection: string[];
  places: NamedPlace[];
  highlightedStatVar: React.RefObject<HTMLDivElement>;
}

export function ChildStatVarSection(
  props: ChildStatVarSectionPropType
): JSX.Element {
  const appContext = useContext(Context);
  return (
    <div className="svg-node-child">
      {props.data.map((statVar) => {
        const isSelected =
          props.pathToSelection.length === 1 &&
          props.pathToSelection[0] === statVar.id;
        return (
          <div
            key={statVar.id}
            ref={isSelected ? props.highlightedStatVar : null}
          >
            {appContext.StatVarHierarchyType ==
              StatVarHierarchyType.TIMELINE && (
              <StatVarCheckbox statVar={statVar.id} />
            )}
            {appContext.StatVarHierarchyType == StatVarHierarchyType.GRAPH && (
              <StatVarNode
                place={props.places[0]}
                selected={isSelected}
                statVar={statVar}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ChildStatVarGroupSectionPropType {
  data: { [key: string]: StatVarGroupNodeType };
  statVarGroupId: string;
  pathToSelection: string[];
  highlightedStatVar: React.RefObject<HTMLDivElement>;
  places: NamedPlace[];
}

export class ChildStatVarGroupSection extends React.Component<
  ChildStatVarGroupSectionPropType
> {
  render(): JSX.Element {
    let childStatVarGroups = this.props.data[this.props.statVarGroupId]
      .childStatVarGroups;
    const variableGroupItem = childStatVarGroups.find((svg) =>
      svg.id.startsWith(VARIABLES_STATVAR_GROUP_PREFIX)
    );
    if (variableGroupItem) {
      childStatVarGroups = childStatVarGroups.filter(
        (svg) => !svg.id.startsWith(VARIABLES_STATVAR_GROUP_PREFIX)
      );
      childStatVarGroups.unshift(variableGroupItem);
    }
    return (
      <div className="svg-node-child">
        {childStatVarGroups.map((childStatVarGroup) => {
          if (
            _.isEmpty(this.props.pathToSelection) ||
            this.props.pathToSelection[0] === childStatVarGroup.id
          ) {
            return (
              <div
                key={childStatVarGroup.id}
                ref={
                  this.props.pathToSelection.length === 1
                    ? this.props.highlightedStatVar
                    : null
                }
              >
                <StatVarGroupNode
                  places={this.props.places}
                  statVarGroupId={childStatVarGroup.id}
                  data={this.props.data}
                  pathToSelection={this.props.pathToSelection.slice(1)}
                  specializedEntity={childStatVarGroup.specializedEntity}
                  open={this.props.pathToSelection[0] === childStatVarGroup.id}
                  isSelected={this.props.pathToSelection.length === 1}
                />
              </div>
            );
          }
        })}
      </div>
    );
  }
}
