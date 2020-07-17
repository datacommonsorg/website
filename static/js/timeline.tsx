import React, { Component } from "react";
import { parseStatVarPath, parsePlace} from "./util";
import { SearchBar } from "./timeline_search";
import { Menu } from "./statsvar_menu";

interface PagePropType {
  search: boolean;
  updateUrl: (statvar: string, shouldAdd: boolean) => void;
}

interface PageStateType {
  statvarPaths: string[][];
  placeList:string[][];
}

class Page extends Component<PagePropType, PageStateType> {
  constructor(props) {
    super(props);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.state = {
      statvarPaths: parseStatVarPath(),
      placeList:parsePlace(),
    };
  }

  componentDidMount() {
    window.addEventListener("hashchange", this.handleHashChange);
  }

  handleHashChange() {
    this.setState({
      statvarPaths: parseStatVarPath(),
      placeList: parsePlace(),
    });
  }

  render() {
    return (
      <div>
          <div id="search">
            <SearchBar placeList={this.state.placeList}/>
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
