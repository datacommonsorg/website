import React, { Component } from "react";
import hierarchy from "../../tools/pv_tree_generator/hierarchy_golden.json";
//import hierarchy from "../data/hierarchy.json";

interface NodePropType {
  title: string;
  selected: string;
  expanded: string;
  count: number;
  children: NodePropType[];
  type: string;
  argString: string;
  updateUrl: (statvar: string, add: boolean) => void;
  nodePath: string;
}

interface NodeStateType {
  checked: boolean;
  expanded: boolean;
  nodePath: string;
}

class Node extends Component<NodePropType, NodeStateType> {
  constructor(props: NodePropType) {
    super(props);
    this._handleCheckboxClick = this._handleCheckboxClick.bind(this);
    this._handleExpandClick = this._handleExpandClick.bind(this);
    this.state = {
      checked: props.selected === "yes" ? true : false,
      expanded: props.selected === "yes" ? true : false,
      nodePath: props.nodePath + "," + props.title,
    };
  }

  render() {
    let checkboxImg;
    let expandImg;
    let child;
    if (this.props.type === "value") {
      checkboxImg = (
        <button
          className={this.state.checked ? "checkbox checked" : "checkbox"}
          onClick={this._handleCheckboxClick}
        />
      );
    }

    if (this.state.expanded) {
      expandImg = (
        <img
          className="right-caret transform-down"
          src="../images/right-caret.png"
          width="12px"
          onClick={this._handleExpandClick}
        />
      );
      if (this.props.children) {
        child = this.props.children.map((item, index) => {
          return (
            <Node
              title={item.title}
              selected={item.selected}
              expanded={item.selected}
              children={item.children}
              count={item.count}
              type={item.type}
              argString={item.argString}
              updateUrl={this.props.updateUrl}
              nodePath={this.state.nodePath}
              key={this.props.argString}
            ></Node>
          );
        });
      }
    } else {
      expandImg = (
        <img
          className="right-caret"
          src="../images/right-caret.png"
          width="12px"
          onClick={this._handleExpandClick}
        />
      );
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
  }

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
}

interface MenuPropType {
  search: boolean;
  updateUrl: (statvar: string, add: boolean) => void;
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
                selected={item.selected}
                expanded={item.selected}
                children={item.children}
                count={item.count}
                type={item.type}
                argString={item.argString}
                key={index1 + "," + index}
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

class page extends Component<MenuPropType, {}> {
  render() {
    return (
      <Menu updateUrl={this.props.updateUrl} search={this.props.search}></Menu>
    );
  }
}
export { page };
