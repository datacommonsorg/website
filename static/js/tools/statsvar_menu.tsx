import React, { Component } from "react";
import axios from "axios";
import hierarchy from "../../data/hierarchy_top.json";
import { updateUrl } from "./timeline_util";

const jsonPath = "../../data/hierarchy_statsvar.json";

interface NodePropType {
  l: string; // label
  c: number; // count
  cd: NodePropType[]; // children
  t: string; // type
  sv: string[];
  statsVarPaths: number[][];
  nodePath: number[];
  statsVarValid: Set<string>;
  filter: boolean;
  idx: number;
  addStatsVarTitle: (statsVarId: string, statsVarName: string) => void;
}

interface NodeStateType {
  checked: boolean;
  expanded: boolean;
  statsVarPaths: number[][];
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
            statsVarPaths={this.state.statsVarPaths}
            key={this.props.l + index}
            statsVarValid={this.props.statsVarValid}
            filter={this.props.filter}
            idx={index}
            addStatsVarTitle={this.props.addStatsVarTitle}
            nodePath={[...this.props.nodePath, index]}
          ></Node>
        );
      });
    }

    return (
      // render the node only if it is a valid value node
      // or it is a property node that can be expanded
      (isValidStatsVar || (this.props.t !== "v" && canExpand)) && (
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
    if (this.state.checked) {
      // delete all related statsVars
      updateUrl({
        statsVar: {
          statsVar:
            this.props.sv.join("__") + "," + this.props.nodePath.join(","),
          shouldAdd: !this.state.checked,
        },
      });
    } else {
      // add available statsVars only
      let validSV = [];
      if (this.props.filter) {
        for (const statsVar of this.props.sv) {
          if (this.props.statsVarValid.has(statsVar)) {
            validSV.push(statsVar);
          }
        }
      } else {
        validSV = this.props.sv;
      }
      updateUrl({
        statsVar: {
          statsVar: validSV.join("__") + "," + this.props.nodePath.join(","),
          shouldAdd: !this.state.checked,
        },
      });
    }
  };

  private _handleExpandClick = (): void => {
    this.setState({
      expanded: !this.state.expanded,
    });
  };

  private _handleHashChange() {
    const statsVarPathNext = [];
    let check = false;
    let expand = this.state.expanded;
    for (const statsVarPath of this.props.statsVarPaths) {
      if (statsVarPath && statsVarPath[0] === this.props.idx) {
        if (statsVarPath.length === 1) {
          check = true;
          for (const sv of this.props.sv) {
            this.props.addStatsVarTitle(sv, this.props.l);
          }
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
      (!this.props.filter ||
        this.hasIntersection(this.props.statsVarValid, this.props.sv))
    );
  }

  private hasIntersection(statsVarValid: Set<string>, statsVars: string[]) {
    for (const value of statsVars) {
      if (statsVarValid.has(value)) {
        return true;
      }
    }
    return false;
  }
  private canExpand() {
    if (this.props.t === "p") {
      // a property node can be expanded if it has >= 1 children
      return this.hasChild(this.props.cd);
    } else if (this.props.t === "c") {
      // the top level node is expandable if has valid value node
      // or valid property node
      let valid = false;
      this.props.cd.map((item) => {
        if (
          item.t === "v" &&
          (!this.props.filter ||
            this.hasIntersection(this.props.statsVarValid, item.sv))
        ) {
          valid = true; // valid value node
        } else if (item.t === "p" && this.hasChild(item.cd)) {
          valid = true; // valid property node
        }
      });
      return valid;
    } else {
      // a value node is expandable if it has valid property node
      let valid = false;
      if (this.props.cd) {
        this.props.cd.map((item) => {
          if (this.hasChild(item.cd)) {
            valid = true;
          }
        });
      }
      return valid;
    }
  }

  private hasChild(children) {
    // return true if a property node has valid children
    let valid = false;
    if (children && children.length !== 0) {
      children.map((item) => {
        if (
          !this.props.filter ||
          this.hasIntersection(this.props.statsVarValid, item.sv)
        ) {
          valid = true;
        }
      });
    }
    return valid;
  }
}

interface MenuPropType {
  statsVarPaths: number[][];
  statsVarValid: Set<string>;
  filter: boolean;
  setStatsVarTitle: (statsVarId2Title: { [key: string]: string }) => void;
}
interface MenuStateType {
  menuJson: [{}];
}
class Menu extends Component<MenuPropType, MenuStateType> {
  statsVarId2Title: { [key: string]: string }; // {Id: Title}
  constructor(props) {
    super(props);
    this.addStatsVarTitle = this.addStatsVarTitle.bind(this);
    this.state = {
      menuJson: [hierarchy],
    };
    this.statsVarId2Title = {};
  }
  render() {
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
                    statsVarPaths={this.props.statsVarPaths}
                    statsVarValid={this.props.statsVarValid}
                    filter={this.props.filter}
                    idx={index}
                    addStatsVarTitle={this.addStatsVarTitle}
                    nodePath={[index]}
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
  addStatsVarTitle(id: string, title: string) {
    this.statsVarId2Title[id] = title;
    if (
      Object.keys(this.statsVarId2Title).length ===
      this.props.statsVarPaths.length
    ) {
      this.props.setStatsVarTitle(this.statsVarId2Title);
    }
  }
}

export { Menu };
