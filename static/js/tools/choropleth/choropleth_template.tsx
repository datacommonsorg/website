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
import { Menu } from "../statsvar_menu";
import { ChoroplethMap, generateBreadCrumbs } from "./choropleth";
import { NoopStatsVarFilter, TimelineStatsVarFilter } from "../commons";
import axios from "axios";

/**
 * Generates choropleth map from API on pageload.
 */
window.onload = () => {
  // Generate page.
  ReactDOM.render(
    React.createElement(MainPane),
    document.getElementById("main-pane")
  );

  // Generate breadcrumbs.
  generateBreadCrumbs();
};

class MainPane extends Component {
  constructor(props: Record<string, unknown>) {
    super(props);

    // Redirect to basic url if none provided.
    if (window.location.search === "") {
      window.location.search =
        "statVar=Count_Person_Employed&pc=t&geoDcid=country/USA";
    }

    // Bind functions as needed.
    this._handleStatVarSelection = this._handleStatVarSelection.bind(this);

    // Get default values for optional fields.
    const urlParams = new URLSearchParams(window.location.search);
    let isPerCapita = false;
    if (urlParams.has("pc")) {
      isPerCapita = ["true", "t", "1"].includes(
        urlParams.get("pc").toLowerCase()
      );
    }

    // Get all statistical variable available for the current subgeo.
    axios
      .get("/api/choropleth/child/statvars?dcid=" + urlParams.get("geoDcid"))
      .then((resp) => {
        if (resp.status === 200) {
          const statVars: Set<string> = new Set();
          resp.data.forEach((item) => statVars.add(item));
          this.setState({
            statsVarFilter: new TimelineStatsVarFilter(statVars),
          });
        }
      });

    // Initialize state.
    this.state = {
      // References used for both choropleth and stats var sidemenu objects.
      choroplethMap: React.createRef(),
      statVarMenuRef: React.createRef(),
      pc: isPerCapita,
      // Default to no filtering in stats var sidemenu until API call returns.
      statsVarFilter: new NoopStatsVarFilter(),
      // Tracks the currently selected node in sidemenu.
      statsVarNodes: {},
    };
  }

  /**
   * Toggles the per capita value of the choropleth map and redraws the map.
   */
  _togglePerCapita(): void {
    // Update locally in parent.
    const newPerCapitaValue = !this.state["pc"];
    this.setState({
      pc: newPerCapitaValue,
    });
    // Redraw the choropleth map.
    const choroplethRef = this.state["choroplethMap"].current;
    choroplethRef.setPerCapita(newPerCapitaValue);
  
    // Update in URL.
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("pc", newPerCapitaValue.toString());
    // TODO(iancostello): Move this into a helper method.
    history.pushState({}, null, "choropleth?" + urlParams.toString());
  }

  /**
   * Passes off the downloading and redrawing of a new statistical variable
   * selection to the child map element.
   * This function is passed as a callback to the statsvar_menu.
   * @param statVar
   */
  _handleStatVarSelection(statVar: string, statVarLocation: string[]): void {
    // Update the choropleth map values.
    const choroplethRef = this.state["choroplethMap"].current;
    choroplethRef.handleStatVarChange(statVar);

    // Update the displayed value in the stats var sidemenu.
    const statsVarNodes = {};
    statsVarNodes[statVar] = [statVarLocation];
    this.setState({ statsVarNodes });
  }

  // call back function passed down to menu for getting statsVar titles
  setStatsVarTitle(statsVarId2Title: Record<string, string>): void {
    this.setState({
      statsVarTitle: statsVarId2Title,
    });
  }

  render(): JSX.Element {
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
                checked={this.state["pc"]}
                name="pc"
                onClick={this._togglePerCapita.bind(this)}
              ></input>
            </div>
            <Menu
              ref={this.state && this.state["statVarMenuRef"]}
              selectedNodes={this.state["statsVarNodes"]}
              statsVarFilter={this.state["statsVarFilter"]}
              setStatsVarTitle={this.setStatsVarTitle.bind(this)}
              addStatsVar={this._handleStatVarSelection.bind(this)}
              removeStatsVar={() => 0}
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
              <ChoroplethMap
                ref={this.state && this.state["choroplethMap"]}
              ></ChoroplethMap>
            </div>
          </React.Fragment>
        </div>
      </div>
    );
  }
}

export { MainPane };
