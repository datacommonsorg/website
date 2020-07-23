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
  svPaths: string[][];
  svValid: Set<string>;
}

interface NodeStateType {
  checked: boolean;
  expanded: boolean;
  nodePath: string;
  svPaths: string[][];
}

class Node extends Component<NodePropType, NodeStateType> {
  constructor(props: NodePropType) {
    super(props);
    this._handleCheckboxClick = this._handleCheckboxClick.bind(this);
    this._handleExpandClick = this._handleExpandClick.bind(this);
    this._handleHashChange = this._handleHashChange.bind(this);
    this.state = {
      checked: false,
      expanded: false,
      nodePath: props.nodePath + SEP + props.l,
      svPaths: [[]],
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.svPaths !== prevProps.svPaths) {
      this._handleHashChange();
    }
  }
  componentDidMount() {
    this._handleHashChange();
  }

  public render = (): JSX.Element => {
    let checkboxImg: JSX.Element;
    let expandImg: JSX.Element;
    let child: JSX.Element[];
    let childCnt = 0;
    let svValid = false;
    if (this.props.t === "v" && this.props.svValid.has(this.props.sv)) {
      svValid = true;
      checkboxImg = (
        <button
          className={this.state.checked ? "checkbox checked" : "checkbox"}
          onClick={this._handleCheckboxClick}
        />
      );
    }

    if (this.props.cd && this.props.cd.length !== 0) {
      this.props.cd.map((item) => {
        if (item.t === "p" || this.props.svValid.has(item.sv)) {
          childCnt += 1;
        }
      });

      if (this.state.expanded) {
        child = this.props.cd.map((item, index) => {
          if (item.t === "p" || this.props.svValid.has(item.sv)) {
            return (
              <Node
                l={item.l}
                cd={item.cd}
                c={item.c}
                t={item.t}
                sv={item.sv}
                nodePath={this.state.nodePath}
                svPaths={this.state.svPaths}
                key={this.props.l + index}
                svValid={this.props.svValid}
              ></Node>
            );
          }
        });
        expandImg = (
          <img
            className="right-caret transform-up"
            src="/images/right-caret-light.png"
            onClick={this._handleExpandClick}
          />
        );
      } else {
        expandImg = (
          <img
            className="right-caret"
            src="/images/right-caret-light.png"
            onClick={this._handleExpandClick}
          />
        );
      }
    }

    return (
      (svValid || childCnt !== 0) && (
        <ul className="noborder">
          <li className="value" id={this.props.l}>
            <span>
              <a className="value-link">
                {this.props.l + "  "}
                <sup>{this.props.c !== 0 && "(" + this.props.c + ")"}</sup>
                {checkboxImg}
                {expandImg}
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
      svPath: {
        statsvar: this.props.sv + this.state.nodePath,
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
    const svPathNext = [];
    let check = false;
    let expand = false;
    for (const svPath of this.props.svPaths) {
      if (svPath[0] === this.props.l) {
        if (svPath.length === 1) {
          check = true;
        } else {
          expand = true;
          svPathNext.push(svPath.slice(1));
        }
      }
    }
    this.setState({
      checked: check,
      expanded: expand,
      svPaths: svPathNext,
    });
  }
}

interface MenuPropType {
  search: boolean;
  svPaths: string[][];
  svValid: Set<string>;
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
                    t={item.t}
                    sv={item.sv}
                    key={index1 + "," + index}
                    svPaths={this.props.svPaths}
                    nodePath=""
                    svValid={this.props.svValid}
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
