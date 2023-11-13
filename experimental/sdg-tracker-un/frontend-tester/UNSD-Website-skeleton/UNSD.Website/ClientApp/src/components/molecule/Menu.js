import React, { Component } from "react";
import { Menu } from "antd";
import { NavLink } from "react-router-dom";
import { routePathConstants, routeCapacityDevelopmentConstants, routeNqafConstants} from "../../helper/Common/RoutePathConstants";
import { isMobile } from "../../script/Commonfunctions";
import { Text, textAsString, LanguageContext } from "../../containers/Language";

const { SubMenu } = Menu;

const getMenuMode = () => {
  if (isMobile()) {
    return "inline";
  } else {
    return "horizontal";
  }
};

let openKeyarray = [];
export default class NavigationMenu extends Component {
  static contextType = LanguageContext;
  // all submenu keys of first level to be declared.
  rootSubmenuKeys = ["about", "topics", "method", "data", "events"];

  state = {
    current: "home",
    openKeys: [],
  };

  componentDidMount() {
    var path =
      window.location.pathname.slice(-1) === "/"
        ? window.location.pathname.slice(0, -1)
        : window.location.pathname;

    if (path.includes(routePathConstants.EVENT_PATH)) {
      if (isMobile()) {
        openKeyarray.push("events");
        this.setState({ openKeys: openKeyarray });
      }

      this.setState({ current: "events" });
    } else if (path.includes("Publications")) {
      this.setState({ current: "publications" });
        }
        else if (path.includes("capacity-development")) {
            this.setState({ current: "capacitydevelopment" });
        }
        else if (
      path == routePathConstants.ABOUT_PATH ||
      path == routePathConstants.FAQ_PATH ||
      path == routePathConstants.STATEMENT_PATH
    ) {
      if (isMobile()) {
        openKeyarray.push("about");
        this.setState({ openKeys: openKeyarray });
      }
      this.setState({ current: "about" });
    } else if (
      path.toLowerCase() == routePathConstants.HOME_PATH.toLowerCase()
    ) {
      this.setState({ current: "home" });
    } else this.setState({ current: "" });
  }

  // function to set the state for highlighting the current active key
  handleClick = (e) => {
    // condition added to avoid highligting the navigation menu, if the navigation is external link then
    if (!e.key.includes("external")) {
      let selectedKey = [];
      if (e.key.split("-").length > 1) {
                selectedKey = e.key.split("-");
                this.setState({ current: selectedKey[0] });
      } else {
                selectedKey = e.key.split(":");
                if (selectedKey.length <= 1)
                    this.setState({ current: selectedKey[0] });
      }
    }
    // condition added to open the menu if it is mobile view
    if (isMobile()) {
      if (e.key.includes("home")) {
        this.setState({
          openKeys: [],
        });
      } else {
        // to set Open key for nested SubMenu
        if (e.key.split("-").length > 1) {
          openKeyarray.push(e.key.split("-")[0]);
        } else {
          openKeyarray.push(e.key.split(":")[0]);
        }

        this.setState({
          openKeys: openKeyarray,
        });
      }

      this.props.onClick();
    }
  };

  // function to open the submenu
  onOpenChange = (openKeys) => {
    const latestOpenKey = openKeys.find(
      (key) => this.state.openKeys.indexOf(key) === -1
    );

    // if the selected key if not found in the first level Menu
    if (this.rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      this.setState({ openKeys });
    } else {
      this.setState({
        openKeys: latestOpenKey ? [latestOpenKey] : [],
      });
    }
  };

  render() {
    const lang = this.context;
    const { current } = this.state;
    return (
      <React.Fragment>
        <Menu
          onClick={this.handleClick}
          selectedKeys={[current]}
          mode={getMenuMode()}
          theme="dark"
          openKeys={this.state.openKeys}
          onOpenChange={this.onOpenChange}
        >
          <Menu.Item key="home">
            <NavLink
              to={`${routePathConstants.HOME_PATH}`}
              className="nav-link"
              exact
            >
              <Text tid="NavHome" />
            </NavLink>
          </Menu.Item>

          <Menu.Item key="datacommons">
            <NavLink
              className="nav-link"
                        id="datacommons"
                        target="_blank"
              to={`${routePathConstants.DATA_COMMONS}`}
            >
              Data Commons
            </NavLink>
          </Menu.Item>

        </Menu>
      </React.Fragment>
    );
  }
}
