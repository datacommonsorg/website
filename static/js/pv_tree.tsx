import React, {Component} from "react";
import hierarchy from "../../tools/pv_tree_generator/hierarchy_golden.json";
//import hierarchy from "../data/hierarchy.json";

// Fields of each node from json file
interface NodeType {
  show: string; 
  title: string; 
  selected: string;
  expanded: string;
  children: NodeType[];
  count: number;
  search_count: number;
  measuredProperty: string;
  placeTypes: string[];
  populationType: string;
  type: string; // Property or Value
  argString: string;// for statvars, argString = dcid
}

interface NodePropType {
  title: string; 
  selected: string;
  expanded: string;
  count: number;
  children: NodeType[];
  type: string;
  argString: string;
  updateurl: (string, boolean) => void;
  nodePath: string;
}

class Node extends Component<NodePropType, {}> {
  constructor(props) {
    super(props);
    this._handleCheckboxClick = this._handleCheckboxClick.bind(this);
    this._handleExpandClick = this._handleExpandClick.bind(this);
    this.state = {
      checked: props.selected === "yes" ? true: false,
      expanded: props.selected === "yes" ? true: false,
      nodePath: props.nodePath + "," + props.title,
    };
  }

  private _handleCheckboxClick = ():void => {
    this.setState({
        checked: !this.state.checked,
    });
    this.props.updateurl(this.props.argString +this.state.nodePath, !this.state.checked);
  }

  private _handleExpandClick = ():void => {
    this.setState({
        expanded: !this.state.expanded,
      });
  }

  render() {
    let checkboxImg;
    let expandImg;
    let child; 
    if (this.props.type === "value") {
      checkboxImg = <button className={this.state.checked? 
                                        "checkbox checked":"checkbox"}  
                              onClick={this._handleCheckboxClick}/>};

    if (this.state.expanded) {
      expandImg = <img className="right-caret transform-down"
                        src="../images/right-caret.png"
                        width = "12px" 
                        onClick={this._handleExpandClick}/>;
      if (this.props.children) {
        child = this.props.children.map((item, index) => {
          return(
            <Node title={item.title} 
                  selected= {item.selected}
                  expanded={item.selected}
                  children={item.children}
                  count={item.count}
                  type={item.type}
                  argString={item.argString}
                  updateurl={this.props.updateurl}
                  nodePath={this.state.nodePath}
                  key={this.props.argString}></Node>
          );
        });
      }
    }
    else {
      expandImg = <img className="right-caret"
                        src="../images/right-caret.png"
                        width = "12px"
                        onClick={this._handleExpandClick}/>
    }

    return (
      <ul className="unordered-list">
        <li className="child" id={this.props.title}>
          <span>
            <a className="value-link">
              {this.props.title + "  "}
              <sup>{this.props.count !== 0 && "("+this.props.count+")"}</sup>
              {checkboxImg} 
              {expandImg}
            </a>
          </span>
          {child}
        </li>
      </ul>
    )
  }
}

interface MenuPropType{
  search: boolean;
  updateurl: (string, bool) => void;
}

class Menu extends Component<MenuPropType, {}> {
  render(){
    let menujson;
    if (this.props.search) {
      menujson = [hierarchy[1]];
    }
    else {
      menujson = [hierarchy[0]];
    }
    
    return(
      <div id="drill">
      {menujson.map((vertical, index1) => {
        return(
            Object.keys(vertical).map((key, index) => {
              const item = vertical[key];
              return(
                <Node title={item.title} 
                    selected= {item.selected}
                    expanded={item.selected}
                    children={item.children}
                    count={item.count}
                    type={item.type}
                    argString={item.argString}
                    key={index1+","+index}
                    nodePath=""
                    updateurl={this.props.updateurl}
                    ></Node>  
              )
            })
        )
      })
      }
      </div>
    )
  }
}

class page extends Component<MenuPropType, {}>{
  render(){
    return <Menu updateurl={this.props.updateurl}
                 search={this.props.search}></Menu>;
  }
}
export {page};
