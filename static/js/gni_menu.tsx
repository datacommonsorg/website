import React, { Component } from "react";
import hierarchy from "../../tools/pv_tree_generator/hierarchy.json";
import { parseStatVarPath } from "./util";

interface NodePropType {
  title: string;
  count: number;
  children: NodePropType[];
  type: string;
  argString: string;
  updateUrl: (statvar: string, add: boolean) => void;
  nodePath: string;
  svPaths: string[][];
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
      nodePath: props.nodePath + "," + props.title.replace(/\s/g, ""),
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
    if (this.props.type === "val") {
      checkboxImg = (
        <button
          className={this.state.checked ? "checkbox checked" : "checkbox"}
          onClick={this._handleCheckboxClick}
        />
      );
    }

    if (this.props.children.length !== 0) {
      if (this.state.expanded) {
        expandImg = (
          <img
            className="right-caret transform-down"
            src="../images/right-caret.png"
            onClick={this._handleExpandClick}
          />
        );
        child = this.props.children.map((item, index) => {
          return (
            <Node
              title={item.title}
              children={item.children}
              count={item.count}
              type={item.type}
              argString={item.argString}
              updateUrl={this.props.updateUrl}
              nodePath={this.state.nodePath}
              svPaths={this.state.svPaths}
              key={this.props.title + index}
            ></Node>
          );
        });
      } else {
        expandImg = (
          <img
            className="right-caret"
            src="../images/right-caret.png"
            onClick={this._handleExpandClick}
          />
        );
      }
    }

    return (
      <ul className="unordered-list">
        <li className="child" id={this.props.title}>
          <span>
            <a className="value-link">
              {this.props.title + "  "}
              <sup>
                {this.props.count !== 0 && "(" + this.props.count + ")"}
              </sup>
              {checkboxImg}
              {expandImg}
            </a>
          </span>
          {child}
        </li>
      </ul>
    );
  };

  private _handleCheckboxClick = (): void => {
    this.setState({
      checked: !this.state.checked,
    });
    this.props.updateUrl(
      this.props.argString + this.state.nodePath,
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
      if (svPath[0] === this.props.title.replace(/\s/g, "")) {
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
  updateUrl: (statvar: string, should_add: boolean) => void;
  svPaths: string[][];
}

class Menu extends Component<MenuPropType, {}> {
  render() {
    let menujson;
    if (this.props.search) {
      menujson = [hierarchy[1]];
    } else {
      menujson = [hierarchy[0]];
    }

    return (
      <div id="drill">
        {menujson.map((vertical, index1) => {
          return Object.keys(vertical).map((key, index) => {
            const item = vertical[key];
            return (
              <Node
                title={item.title}
                children={item.children}
                count={item.count}
                type={item.type}
                argString={item.argString}
                key={index1 + "," + index}
                svPaths={this.props.svPaths}
                nodePath=""
                updateUrl={this.props.updateUrl}
              ></Node>
            );
          });
        })}
      </div>
    );
  }
}

export { Menu };
