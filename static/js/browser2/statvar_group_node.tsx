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
import _ from "lodash";
import Collapsible from "react-collapsible";
import { StatVarGroupNodeType, StatVarHierarchyNodeType } from "./util";
import { StatVarNode } from "./statvar_node";

interface StatVarGroupNodePropType {
  dcid: string;
  placeName: string;
  statVarGroupId: string;
  data: { [key: string]: StatVarGroupNodeType };
  pathToSelection: string[];
  specializedEntity?: string;
  isSelected: boolean;
  isOpened: boolean;
}

interface StatVarGroupNodeStateType {
  renderContent: boolean;
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
      renderContent: this.props.isOpened,
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
        title: triggerTitle,
        opened,
        highlighted: this.props.isSelected,
        nodeType: StatVarHierarchyNodeType.STAT_VAR_GROUP,
      });
    };
    return (
      <Collapsible
        trigger={getTrigger(false)}
        triggerWhenOpen={getTrigger(true)}
        open={this.props.isOpened}
        onOpening={() => this.setState({ renderContent: true })}
        transitionTime={200}
        onOpen={this.scrollToHighlighted}
      >
        {this.state.renderContent ? (
          <>
            {this.props.pathToSelection.length < 2 ? (
              <div className="svg-node-child">
                {this.props.data[this.props.statVarGroupId].childStatVars
                  ? this.props.data[
                      this.props.statVarGroupId
                    ].childStatVars.map((statVar) => {
                      const isSelected =
                        this.props.pathToSelection.length === 1 &&
                        this.props.pathToSelection[0] === statVar.id;
                      return (
                        <div
                          key={statVar.id}
                          ref={isSelected ? this.highlightedStatVar : null}
                        >
                          <StatVarNode
                            dcid={this.props.dcid}
                            statVar={statVar}
                            nodeName={this.props.placeName}
                            selected={isSelected}
                          />
                        </div>
                      );
                    })
                  : null}
              </div>
            ) : null}
            <div className="svg-node-child">
              {this.props.data[this.props.statVarGroupId].childStatVarGroups
                ? this.props.data[
                    this.props.statVarGroupId
                  ].childStatVarGroups.map((childStatVarGroup) => {
                    if (
                      _.isEmpty(this.props.pathToSelection) ||
                      this.props.pathToSelection[0] === childStatVarGroup.id
                    ) {
                      return (
                        <div
                          key={childStatVarGroup.id}
                          ref={
                            this.props.pathToSelection.length === 1
                              ? this.highlightedStatVar
                              : null
                          }
                        >
                          <StatVarGroupNode
                            dcid={this.props.dcid}
                            placeName={this.props.placeName}
                            statVarGroupId={childStatVarGroup.id}
                            data={this.props.data}
                            pathToSelection={this.props.pathToSelection.slice(
                              1
                            )}
                            specializedEntity={
                              childStatVarGroup.specializedEntity
                            }
                            isOpened={
                              this.props.pathToSelection[0] ===
                              childStatVarGroup.id
                            }
                            isSelected={this.props.pathToSelection.length === 1}
                          />
                        </div>
                      );
                    }
                  })
                : null}
            </div>
          </>
        ) : null}
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
    }, 400);
  }
}

interface statVarHierarchyNodeHeaderPropType {
  title: string;
  opened: boolean;
  highlighted: boolean;
  nodeType: StatVarHierarchyNodeType;
}

export class StatVarHierarchyNodeHeader extends React.Component<
  statVarHierarchyNodeHeaderPropType
> {
  render(): JSX.Element {
    let prefixHtml =
      this.props.nodeType === StatVarHierarchyNodeType.STAT_VAR ? (
        <span>&#8226;</span>
      ) : null;
    if (this.props.nodeType === StatVarHierarchyNodeType.STAT_VAR_GROUP) {
      prefixHtml = this.props.opened ? (
        <span>&#x25BC;</span>
      ) : (
        <span>&#x25BA;</span>
      );
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
