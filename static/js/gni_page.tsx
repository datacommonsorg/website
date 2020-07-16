import React, { Component } from "react";
import { parseStatVarPath } from "./util";
import { SearchBar } from "./gni_search";
import { Menu } from "./gni_menu";

interface PagePropType {
  search: boolean;
  updateUrl: (statvar: string, should_add: boolean) => void;
}

interface PageStateType {
  statvarPaths: string[][];
}

class Page extends Component<PagePropType, PageStateType> {
  constructor(props) {
    super(props);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.state = {
      statvarPaths: parseStatVarPath(),
    };
  }

  componentDidMount() {
    window.addEventListener("hashchange", this.handleHashChange);
  }

  handleHashChange() {
    this.setState({
      statvarPaths: parseStatVarPath(),
    });
  }

  render() {
    return (
      <div>
        <div id="view">
          <div id="search">
            <SearchBar />
          </div>
        </div>
        <div className="explore-menu-container" id="explore">
          <Menu
            updateUrl={this.props.updateUrl}
            search={this.props.search}
            svPaths={this.state.statvarPaths}
          ></Menu>
        </div>
      </div>
    );
  }
}
export { Page };
