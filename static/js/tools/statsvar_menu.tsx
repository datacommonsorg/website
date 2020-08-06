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

import React, { Component } from "react";
import axios from "axios";
import hierarchy from "../../data/hierarchy_top.json";
import { StatsVarFilterInterface } from "./commons";
import _ from "lodash";

const jsonPath = "../../data/hierarchy_statsvar.json";

interface NodeJsonField {
  l: string; // label
  c: number; // count
  cd: NodeJsonField[]; // children
  t: string; // type
  sv: string[]; // statsVar dcid
}

interface NodePropType {
  l: string; // label
  c: number; // count
  cd: NodeJsonField[]; // children
  t: string; // type
  sv: string[]; // statsVar dcid
  selectedNodePaths: string[][]; // path to all the selected statsVars
  nodePath: string[]; // path to current node
  addStatsVarTitle: (statsVarId: string, statsVarName: string) => void; // pass the title of selected statsVar to parent
  addStatsVar: (statsVar: string, nodePath: string[]) => void; // function for adding statsVar
  removeStatsVar: (statsVar: string, nodePath?: string[]) => void; // function for removing statsVar
  statsVarFilter: StatsVarFilterInterface; // filtering the statsVar
}

interface NodeStateType {
  checked: boolean;
  expanded: boolean;
}

class Node extends Component<NodePropType, NodeStateType> {
  constructor(props: NodePropType) {
    super(props);
    this._handleCheckboxClick = this._handleCheckboxClick.bind(this);
    this._handleExpandClick = this._handleExpandClick.bind(this);
    this.isValidNode = this.isValidNode.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
    this.state = {
      checked: false,
      expanded: false,
    };
  }

  public render = (): JSX.Element => {
    return (
      // render the node if it's valid
      this.isValidNode(this.props) && (
        <ul className="noborder">
          <li className="value" id={this.props.l}>
            <span>
              <a className="value-link">
                {this.props.l + "  "}
                <sup>{this.props.c !== 0 && "(" + this.props.c + ")"}</sup>
                {this.props.t === "v" && (
                  <button
                    className={
                      this.state.checked ? "checkbox checked" : "checkbox"
                    }
                    onClick={this._handleCheckboxClick}
                  />
                )}
                {this.checkExpand() && (
                  <img
                    className={
                      this.state.expanded
                        ? "right-caret transform-up"
                        : "right-caret"
                    }
                    src="/images/right-caret-light.png"
                    onClick={this._handleExpandClick}
                  />
                )}
              </a>
            </span>
            {this.checkExpand &&
              this.state.expanded &&
              this.props.cd.map((item, index) => {
                return (
                  <Node
                    l={item.l}
                    cd={item.cd}
                    c={item.c}
                    t={item.t}
                    sv={item.sv}
                    selectedNodePaths={this.props.selectedNodePaths}
                    key={this.props.l + index}
                    statsVarFilter={this.props.statsVarFilter}
                    addStatsVarTitle={this.props.addStatsVarTitle}
                    nodePath={[...this.props.nodePath, index.toString()]}
                    addStatsVar={this.props.addStatsVar}
                    removeStatsVar={this.props.removeStatsVar}
                  ></Node>
                );
              })}
          </li>
        </ul>
      )
    );
  };

  componentDidUpdate(prevProps) {
    if (!_.isEqual(this.props.selectedNodePaths, prevProps.selectedNodePaths)) {
      this.onUpdate();
    }
  }

  componentDidMount() {
    this.onUpdate();
  }

  private onUpdate() {
    let check = this.state.checked;
    let expand = this.state.expanded;
    for (const nodePath of this.props.selectedNodePaths) {
      if (
        _.isEqual(
          _.take(nodePath, this.props.nodePath.length),
          this.props.nodePath
        )
      ) {
        if (_.isEqual(nodePath, this.props.nodePath)) {
          check = true;
          for (const sv of this.props.sv) {
            if (this.props.statsVarFilter.isValid(sv)) {
              this.props.addStatsVarTitle(sv, this.props.l);
            } else {
              // remove the statsVar if not available
              this.props.removeStatsVar(sv);
            }
          }
        } else {
          expand = true;
        }
      }
    }
    this.setState({
      checked: check,
      expanded: expand,
    });
  }

  private _handleCheckboxClick = (): void => {
    this.setState({
      checked: !this.state.checked,
    });
    if (this.state.checked) {
      // delete all related statsVars
      for (const statsVar of this.props.sv) {
        this.props.removeStatsVar(statsVar);
      }
    } else {
      // add available statsVars only
      for (const statsVar of this.props.sv) {
        if (this.props.statsVarFilter.isValid(statsVar)) {
          this.props.addStatsVar(statsVar, this.props.nodePath);
        }
      }
    }
  };

  private _handleExpandClick = (): void => {
    this.setState({
      expanded: !this.state.expanded,
    });
  };

  /**
   * Check if a node can be expanded.
   */
  private checkExpand(): boolean {
    // Value node can be expanded if one of the child node is valid.
    if (this.props.t === "v") {
      if (this.props.cd) {
        for (const child of this.props.cd) {
          if (this.isValidNode(child)) {
            return true;
          }
        }
      }
      return false;
    }
    // Property and Top node can always expand since it is valid to be created.
    return true;
  }

  private isValidNode(node: NodePropType | NodeJsonField): boolean {
    // For value node, the stats var should be valid.
    if (node.t === "v") {
      for (const sv of node.sv) {
        if (this.props.statsVarFilter.isValid(sv)) {
          return true;
        }
      }
      return false;
    }
    // For property node and top node, at lease one of the child node should be
    // valid.
    if (node.cd && node.cd.length !== 0) {
      for (const child of node.cd) {
        if (this.isValidNode(child)) {
          return true;
        }
      }
    }
    return false;
  }
}

interface MenuPropType {
  selectedNodePaths: string[][];
  statsVarFilter: StatsVarFilterInterface;
  setStatsVarTitle: (statsVarId2Title: Record<string, string>) => void;
  addStatsVar: (statsVar: string, nodePath: string[]) => void;
  removeStatsVar: (statsVar: string, nodePath?: string[]) => void;
}

interface MenuStateType {
  menuJson: [unknown];
}

class Menu extends Component<MenuPropType, MenuStateType> {
  statsVarId2Title: Record<string, string>; // {Id: Title}

  constructor(props: MenuPropType) {
    super(props);
    this.addStatsVarTitle = this.addStatsVarTitle.bind(this);
    this.state = {
      menuJson: [hierarchy],
    };
    this.statsVarId2Title = {};
  }

  render(): JSX.Element {
    this.statsVarId2Title = {};
    return (
      <div id="drill">
        <div className="noedge">
          {this.state.menuJson.map((vertical, index1) => {
            return Object.keys(vertical).map((key, index) => {
              const item = vertical[key];
              return (
                item.cd.length !== 0 && (
                  <Node
                    l={item.l}
                    cd={item.cd}
                    c={item.c}
                    t="c"
                    sv={item.sv}
                    key={index1 + "," + index}
                    selectedNodePaths={this.props.selectedNodePaths}
                    statsVarFilter={this.props.statsVarFilter}
                    addStatsVarTitle={this.addStatsVarTitle}
                    removeStatsVar={this.props.removeStatsVar}
                    addStatsVar={this.props.addStatsVar}
                    nodePath={[index.toString()]}
                  ></Node>
                )
              );
            });
          })}
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    axios.get(jsonPath).then((resp) => {
      this.setState({
        menuJson: [resp.data],
      });
    });
  }

  private addStatsVarTitle(id: string, title: string): void {
    this.statsVarId2Title[id] = title;
    if (
      Object.keys(this.statsVarId2Title).length ===
      this.props.selectedNodePaths.length
    ) {
      this.props.setStatsVarTitle(this.statsVarId2Title);
    }
  }
}

export { Menu };
