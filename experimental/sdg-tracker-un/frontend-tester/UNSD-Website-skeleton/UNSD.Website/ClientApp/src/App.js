import { faAngleUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BackTop, Layout } from "antd";
import { createBrowserHistory } from "history";
import React, { Component } from "react";
import { Route } from "react-router";
import { BrowserRouter, Redirect, Switch } from "react-router-dom";
import DataforNowFooter from "./components/DataforNowFooter";
import MainFooter from "./components/Footer";
import HeaderInfo from "./components/Header";
import ScrollToTop from "./components/molecule/ScrollToTop";
import {
  routeCapacityDevelopmentConstants,
  routeCitizenDataBasepath,
  routeDataCommonsBasepath,
  routeDataCommonsConstants,
  routeDataforNowBasepath,
  routePathConstants,
} from "./helper/Common/RoutePathConstants";
import { Home } from "./pages/Home/Home";

import { LanguageProvider } from "./containers/Language";

import "antd/dist/antd.css";
import withTracker from "../src/withTracker";

//import { DataCommons } from "./pages/DataCommons/DataCommons"
//import DataCommonsSDGTemplate from "./templates/DataCommons/DataCommonsSDGTemplate"
//import DataCommonsDynamicTemplate from "./templates/DataCommons/DataCommonsDynamicTemplate"
import DataCommonsLayout from "./components/DataCommons/DataCommonsLayout";
import DataCommonsDynamicTemplate from "./templates/DataCommons/App";

const { Footer } = Layout;
const UrlPath = window.location.pathname;

export const history = createBrowserHistory({
  baseName: process.env.PUBLIC_URL,
});

export default class App extends Component {
  isDefaultHeader = (url) => {
    let isValid = true;

    const urlPath = url.toLowerCase();
    /*if (urlPath.indexOf(routeNqafBasepath) > 0) {
          isValid = false;
      } else if (urlPath.indexOf(routeResourceCatalogBasepath) > 0) {
          isValid = false;
      } else */
    if (urlPath.indexOf(routeDataCommonsBasepath) > 0) {
      isValid = false;
    } else {
      isValid = true;
    }
    return isValid;
  };

  render() {
    return (
      <LanguageProvider>
        <BrowserRouter history={history}>
          <ScrollToTop />
          {this.isDefaultHeader(UrlPath) ? <HeaderInfo /> : null}
          <Switch>
            <Route
              exact
              path={`${routePathConstants.HOME_PATH}`}
              component={withTracker(Home)}
            />

            <Route
              exact
              path={`${routePathConstants.DATA_COMMONS}`}
              component={withTracker(
                DataCommonsLayout(DataCommonsDynamicTemplate)
              )}
            />
            <Route
              exact
              path={`${routeDataCommonsConstants.COUNTRY}/:dcid?`}
              component={withTracker(
                DataCommonsLayout(DataCommonsDynamicTemplate)
              )}
            />
            <Route
              exact
              path={`${routeDataCommonsConstants.GOAL}`}
              component={withTracker(
                DataCommonsLayout(DataCommonsDynamicTemplate)
              )}
            />
            <Route
              exact
              path={`${routeDataCommonsConstants.TOPIC}`}
              component={withTracker(
                DataCommonsLayout(DataCommonsDynamicTemplate)
              )}
            />
            <Route
              exact
              path={`${routeDataCommonsConstants.SEARCH}`}
              component={withTracker(
                DataCommonsLayout(DataCommonsDynamicTemplate)
              )}
            />

            <Route
              render={() => (
                <Redirect
                  to={{ pathname: `${routePathConstants.HOME_PATH}` }}
                />
              )}
            />
          </Switch>
          {this.isDefaultHeader(UrlPath) ? (
            <Footer
              className={
                UrlPath.toLowerCase().indexOf(routeDataforNowBasepath) > 0 ||
                UrlPath.toLowerCase().indexOf(routeCitizenDataBasepath) > 0 ||
                UrlPath.toLowerCase().indexOf(
                  routeCapacityDevelopmentConstants
                ) > 0
                  ? "datafornowfooter"
                  : ""
              }
            >
              <BackTop>
                <div className="backtotop">
                  <FontAwesomeIcon icon={faAngleUp} title="Back to Top" />
                </div>
              </BackTop>
              {UrlPath.toLowerCase().indexOf(routeDataforNowBasepath) > 0 ||
              UrlPath.toLowerCase().indexOf(routeCitizenDataBasepath) > 0 ||
              UrlPath.toLowerCase().indexOf(routeCapacityDevelopmentConstants) >
                0 ? (
                <DataforNowFooter />
              ) : (
                <MainFooter />
              )}
            </Footer>
          ) : null}
        </BrowserRouter>
      </LanguageProvider>
    );
  }
}
