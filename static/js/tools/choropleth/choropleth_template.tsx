/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { Component } from "react";
import ReactDOM from "react-dom";
import { ChoroplethMap, generateBreadCrumbs } from "./choropleth";

/**
 * Generates choropleth map from API on pageload.
 */
window.onload = () => {
  ReactDOM.render(
    React.createElement(MainPane),
    document.getElementById("main-pane")
  );

  // Generate breadcrumbs.
  generateBreadCrumbs();
};

class MainPane extends Component {
  render(): JSX.Element {
    return (
      <React.Fragment>
        <div className="column" id="breadcrumbs"></div>
        <ChoroplethMap></ChoroplethMap>
        <div className="column" id="hover-text-display"></div>
      </React.Fragment>
    );
  }
}

export { MainPane };
