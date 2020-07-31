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

/** React component for the entire choropleth page with sidebar and map. */

import React from "react";
import { Menu } from "../statsvar_menu";
const axios = require("axios");
import {
  PageStateType
} from "../timeline_page"

class MainPane extends React.Component<{}, PageStateType> {
  constructor(props) {
    super(props);
    // TODO(iancostello): Handle bad inputs.

    // Add function bindings.
    this._togglePerCapita = this._togglePerCapita.bind(this);

    // Get default values for optional fields.
    var urlParams = new URLSearchParams(window.location.search);
    var isPerCapita = false
    if (urlParams.has("perCapita")) {
      isPerCapita = ["true", "t", "1"].includes(
        urlParams.get("perCapita").toLowerCase());
    }
    this.state = {
      statsVarPaths: [],
      statsVarInfo: {},
      perCapita: isPerCapita,
      places: [],
      statsVarValid: new Set(),
    };

    // TODO(iancostello): Don't assume the property exists.
    // Create promise to get valid stat vars for subgeos geo.
    axios.get("/child/statvars?dcid=" + urlParams.get("dcid")).then((resp) => {
      this.setState({
        statsVarValid: resp.data
      });
    })
  }

  /**
   * Performs a redirect to toggle the per capita value of the choropleth map.
   */
  _togglePerCapita() {
    var urlParams = new URLSearchParams(window.location.search);
    var newPerCapitaValue = !this.state.perCapita
    this.setState({
      perCapita: newPerCapitaValue
    })
    urlParams.set("perCapita", newPerCapitaValue.toString());
    window.location.search = urlParams.toString()
  }

  /**
   * Performs a redirect to a new statistical variable on selection.
   * This function is passed as a callback to the statsvar_menu.
   * @param statVar 
   */
  _handleStatVarSelection(statVar: string) {
    var urlParams = new URLSearchParams(window.location.search);
    urlParams.set("statVar", statVar);
    window.location.search = urlParams.toString();
  }

  render() {
    return (
      <div>
        <div className="explore-menu-container" id="explore">
          <div id="drill-scroll-container">
            <div className="title">Select variables:</div>
            <div id="percapita-link" className="text">
              <label htmlFor="percapita">Per capita</label>
              <input
                type="checkbox"
                id="percapita"
                checked={this.state.perCapita}
                name="pc"
                onClick={this._togglePerCapita}
              ></input>
            </div>
            <Menu
              //Removed in recent PR.
              search={false}
              statsVarPaths={this.state.statsVarPaths}
              
              // Used for filtering. It can be an empty list if no filters.
              statsVarValid={this.state.statsVarValid}
              filter={this.state.places.length !== 0}
              onClick={this._handleStatVarSelection}
            ></Menu>
          </div>
        </div>
        <div id="main-content">
          <React.Fragment>
            <div id="heading">Loading...</div>
            <div>
              <div className="column" id="breadcrumbs"></div>
              <div className="column" id="hover-text-display"></div>
            </div>
            <div>
              <svg id="map_container" width="800px" height="500px">
                <g className="map"></g>
                <g className="bounding-box">
                  <rect></rect>
                </g>
                <g className="centroid">
                  <circle r="4"></circle>
                </g>
              </svg>
            </div>
          </React.Fragment>
        </div>
      </div>
    );
  }
}

export { MainPane };
