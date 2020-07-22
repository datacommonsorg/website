import React, { Component } from "react";
import axios from "axios";
import hierarchy from "../../../tools/pv_tree_generator/hierarchy_top.json";

const jsonPath = "data/hierarchy_statsvar.json";
export const SEP = "'";

interface NodePropType {
  l: string; // label
  c: number; // count
  cd: NodePropType[]; // children
  t: string; // type
  sv: string;
  updateUrl: (statvar: string, add: boolean) => void;
  nodePath: string;
  svPaths: string[][];
  svValid: Set<string>;
  filter: boolean;
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
    this.expandable = this.expandable.bind(this);
    this.validSV = this.validSV.bind(this);
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
    let child: JSX.Element[];
    const validSV = this.validSV();
    const expandable = this.expandable();
    if (expandable && this.state.expanded) {
      child = this.props.cd.map((item, index) => {
        return (
          <Node
            l={item.l}
            cd={item.cd}
            c={item.c}
            t={item.t}
            sv={item.sv}
            updateUrl={this.props.updateUrl}
            nodePath={this.state.nodePath}
            svPaths={this.state.svPaths}
            key={this.props.l + index}
            svValid={this.props.svValid}
            filter={this.props.filter}
          ></Node>
        );
      });
    }

    return (
      // render the node only if it is a valid SV node or it is expandable
      (validSV || expandable) && (
        <ul className="noborder">
          <li className="value" id={this.props.l}>
            <span>
              <a className="value-link">
                {this.props.l + "  "}
                <sup>{this.props.c !== 0 && "(" + this.props.c + ")"}</sup>
                {validSV && (
                  <button
                    className={this.state.checked ? "checkbox checked" : "checkbox"}
                    onClick={this._handleCheckboxClick}
                  />
                )}
                {expandable && (
                  <img
                    className={this.state.expanded ? "right-caret transform-up" : "right-caret"}
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
    this.props.updateUrl(
      this.props.sv + this.state.nodePath,
      !this.state.checked
    );
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

  private validSV() {
    // the node is valid statsvar node if it is a value node,
    // and the statsvar is available or not filtered.
    return (
      this.props.t === "v" &&
      (!this.props.filter || this.props.svValid.has(this.props.sv))
    );
  }

  private expandable() {
    let childCnt = 0;
    if (this.props.cd && this.props.cd.length !== 0) {
      this.props.cd.map((item) => {
        if (
          // a valid child node is either a property node,
          // or a value node not filtered
          // or a value node with valid statvar id
          item.t === "p" ||
          !this.props.filter ||
          this.props.svValid.has(item.sv)
        ) {
          childCnt += 1;
        }
      });
    }
    return childCnt > 0;
  }
}

interface MenuPropType {
  search: boolean;
  updateUrl: (statvar: string, shouldAdd: boolean) => void;
  svPaths: string[][];
  svValid: Set<string>;
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
                    t={item.t}
                    sv={item.sv}
                    key={index1 + "," + index}
                    svPaths={this.props.svPaths}
                    nodePath=""
                    updateUrl={this.props.updateUrl}
                    svValid={this.props.svValid}
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
