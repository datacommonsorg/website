import React, { Component } from "react";
import axios from "axios";
import hierarchy from "../../../tools/pv_tree_generator/hierarchy_top.json";
import { updateUrl } from "./timeline_util";

const jsonPath = "data/hierarchy_statsvar.json";
export const SEP = "'";

interface NodePropType {
  l: string; // label
  c: number; // count
  cd: NodePropType[]; // children
  t: string; // type
  sv: string;
  nodePath: string;
  statsVarPaths: string[][];
  statsVarValid: Set<string>;
  filter: boolean;
}

interface NodeStateType {
  checked: boolean;
  expanded: boolean;
  nodePath: string;
  statsVarPaths: string[][];
}

class Node extends Component<NodePropType, NodeStateType> {
  constructor(props: NodePropType) {
    super(props);
    this._handleCheckboxClick = this._handleCheckboxClick.bind(this);
    this._handleExpandClick = this._handleExpandClick.bind(this);
    this._handleHashChange = this._handleHashChange.bind(this);
    this.canExpand = this.canExpand.bind(this);
    this.isValidStatsVar = this.isValidStatsVar.bind(this);
    this.state = {
      checked: false,
      expanded: false,
      nodePath: props.nodePath + SEP + props.l,
      statsVarPaths: [[]],
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.statsVarPaths !== prevProps.statsVarPaths) {
      this._handleHashChange();
    }
  }
  componentDidMount() {
    this._handleHashChange();
  }

  public render = (): JSX.Element => {
    let child: JSX.Element[];
    const isValidStatsVar = this.isValidStatsVar();
    const canExpand = this.canExpand();
    if (canExpand && this.state.expanded) {
      child = this.props.cd.map((item, index) => {
        return (
          <Node
            l={item.l}
            cd={item.cd}
            c={item.c}
            t={item.t}
            sv={item.sv}
            nodePath={this.state.nodePath}
            statsVarPaths={this.state.statsVarPaths}
            key={this.props.l + index}
            statsVarValid={this.props.statsVarValid}
            filter={this.props.filter}
          ></Node>
        );
      });
    }

    return (
      // render the node only if it is a valid SV node or it is canExpand
      (isValidStatsVar || (this.props.t !== 'v' && canExpand)) && (
        <ul className="noborder">
          <li className="value" id={this.props.l}>
            <span>
              <a className="value-link">
                {this.props.l + "  "}
                <sup>{this.props.c !== 0 && "(" + this.props.c + ")"}</sup>
                {isValidStatsVar && (
                  <button
                    className={
                      this.state.checked ? "checkbox checked" : "checkbox"
                    }
                    onClick={this._handleCheckboxClick}
                  />
                )}
                {canExpand && (
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
            {child}
          </li>
        </ul>
      )
    );
  };
  private _handleCheckboxClick = (): void => {
    this.setState({
      checked: !this.state.checked,
    });
    updateUrl({
      statsVarPath: {
        statsVar: this.props.sv + this.state.nodePath,
        shouldAdd: !this.state.checked,
      },
    });
  };

  private _handleExpandClick = (): void => {
    this.setState({
      expanded: !this.state.expanded,
    });
  };

  private _handleHashChange() {
    const statsVarPathNext = [];
    let check = false;
    let expand = false;
    for (const statsVarPath of this.props.statsVarPaths) {
      if (statsVarPath[0] === this.props.l) {
        if (statsVarPath.length === 1) {
          check = true;
        } else {
          expand = true;
          statsVarPathNext.push(statsVarPath.slice(1));
        }
      }
    }
    this.setState({
      checked: check,
      expanded: expand,
      statsVarPaths: statsVarPathNext,
    });
  }

  private isValidStatsVar() {
    // the node is valid statsvar node if it is a value node,
    // and the statsvar is available or not filtered.
    return (
      this.props.t === "v" &&
      (!this.props.filter || this.props.statsVarValid.has(this.props.sv))
    );
  }

  private canExpand() {
    if (this.props.t !== "c") {
      // a node can be expanded if it has >= 1 children
      return this.childCnt(this.props.cd) !== 0;
    } else {
      // if the node is the top level node i.e. this.props.t === "c"
      // we need to check if its child node has valid nodes.
      let childCnt = 0; // number of valid child nodes
      this.props.cd.map((item) => {
        let valid = false;
        if (
          item.t === "v" &&
          (!this.props.filter || this.props.statsVarValid.has(item.sv))
        ) {
          valid = true;// the node is valid if it's a valid value node
        }
         else if (this.childCnt(item.cd) !== 0) {
          valid = true;// the node is valid if it has non-zero children
        }
        if (valid) {
          childCnt += 1;
        }
      });
      return childCnt !== 0;
    }
  }

  private childCnt(children) {
    let childCnt = 0;
    if (children && children.length !== 0) {
      children.map((item) => {
        if (
          // a valid child node is either a property node,
          // or a value node not filtered
          // or a value node with valid statsVar id
          item.t !== "v" ||
          !this.props.filter ||
          this.props.statsVarValid.has(item.sv)
        ) {
          childCnt += 1;
        }
      });
    }
    return childCnt;
  }
}

interface MenuPropType {
  search: boolean;
  statsVarPaths: string[][];
  statsVarValid: Set<string>;
  filter: boolean;
}
interface MenuStateType {
  menuJson: [{}];
}
class Menu extends Component<MenuPropType, MenuStateType> {
  constructor(props) {
    super(props);
    this.state = {
      menuJson: [hierarchy],
    };
  }
  render() {
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
                    statsVarPaths={this.props.statsVarPaths}
                    nodePath=""
                    statsVarValid={this.props.statsVarValid}
                    filter={this.props.filter}
                  ></Node>
                )
              );
            });
          })}
        </div>
      </div>
    );
  }
  componentDidMount() {
    axios.get(jsonPath).then((resp) => {
      this.setState({
        menuJson: [resp.data],
      });
    });
  }
}

export { Menu };
