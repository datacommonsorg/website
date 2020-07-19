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
import {
  parseStatVarPath,
  parsePlace,
  getStatsVarInfo,
  getPlaceNames,
} from "./timeline_util";
import { SearchBar } from "./timeline_search";
import { Menu } from "./statsvar_menu";
import { ChartRegion, StatVarInfo } from "./timeline_chart";
import {Info} from "./timeline_info";

interface PagePropType {
  search: boolean;
  updateUrl: (statvar: string, shouldAdd: boolean) => void;
}

interface PageStateType {
  statvarPaths: string[][];
  statvarInfo: { [key: string]: StatVarInfo };
  places: [string, string][]; // [(placeId, placeName)]
  perCapita: boolean;
}

class Page extends Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.handleHashChange = this.handleHashChange.bind(this);
    this._togglePerCapita = this._togglePerCapita.bind(this);
    this.state = {
      statvarPaths: [],
      statvarInfo: {},
      places: [],
      perCapita: false,
    };
  }

  componentDidMount() {
    window.addEventListener("hashchange", this.handleHashChange);
    this.handleHashChange();
  }

  handleHashChange() {
    const svPaths = parseStatVarPath()[0];
    const svIds = parseStatVarPath()[1];

    let statvarInfoPromise = Promise.resolve(this.state.statvarInfo);
    if (svPaths !== this.state.statvarPaths) {
      if (svIds.length !== 0) {
        statvarInfoPromise = getStatsVarInfo(svIds);
      } else {
        statvarInfoPromise = Promise.resolve({});
      }
    }

    let placesPromise = Promise.resolve(this.state.places);
    const placeIds = parsePlace();
    if (placeIds !== Object.keys(this.state.places)) {
      if (placeIds.length !== 0) {
        placesPromise = getPlaceNames(placeIds).then((data) =>
          Object.entries(data)
        );
      } else {
        placesPromise = Promise.resolve([]);
      }
    }

    Promise.all([statvarInfoPromise, placesPromise]).then((values) => {
      for(let idx=0; idx<svIds.length; idx++){
        values[0][svIds[idx]].title=svPaths[idx][svPaths[idx].length -1]
      }
      this.setState({
        statvarInfo: values[0],
        statvarPaths: svPaths,
        places: values[1],
      });
    });
  }

  _togglePerCapita() {
    this.setState({
      perCapita: !this.state.perCapita,
    });
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
                name="pc"
                onClick={this._togglePerCapita}
              ></input>
            </div>
            <Menu
              updateUrl={this.props.updateUrl}
              search={this.props.search}
              svPaths={this.state.statvarPaths}
            ></Menu>
          </div>
        </div>
        <div id="plot-container">
          <div className="container">
            <div id="search">
              <SearchBar places={this.state.places} />
            </div>
            {(window.location.hash === "") && <Info/>}
            <div id="chart-region">
              <ChartRegion
                places={this.state.places}
                statVars={this.state.statvarInfo}
                perCapita={this.state.perCapita}
                width={500}
                height={500}
              ></ChartRegion>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export { Page };
