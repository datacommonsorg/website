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
  parseUrl,
  getStatsVarInfo,
  getPlaceNames,
  getStatsVar,
  updateUrl,
} from "./timeline_util";
import { SearchBar } from "./timeline_search";
import { Menu } from "./statsvar_menu";
import { ChartRegion, StatVarInfo } from "./timeline_chart";
import { Info } from "./timeline_info";

interface PagePropType {
  search: boolean;
}

interface PageStateType {
  statvarPaths: string[][];
  statvarInfo: { [key: string]: StatVarInfo };
  places: [string, string][]; // [(placeId, placeName)]
  perCapita: boolean;
  statvarValid: Set<string>;
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
      statvarValid: new Set(),
    };
  }

  componentDidMount() {
    window.addEventListener("hashchange", this.handleHashChange);
    this.handleHashChange();
  }

  handleHashChange() {
    const urlVar = parseUrl();

    let statvarInfoPromise = Promise.resolve(this.state.statvarInfo);
    if (urlVar.svPath !== this.state.statvarPaths) {
      if (urlVar.svId.length !== 0) {
        statvarInfoPromise = getStatsVarInfo(urlVar.svId);
      } else {
        statvarInfoPromise = Promise.resolve({});
      }
    }

    let placesPromise = Promise.resolve(this.state.places);
    let validStatsVarPromise = Promise.resolve(this.state.statvarValid);
    if (urlVar.placeId !== Object.keys(this.state.places)) {
      validStatsVarPromise = getStatsVar(urlVar.placeId);
      if (urlVar.placeId.length !== 0) {
        placesPromise = getPlaceNames(urlVar.placeId).then((data) =>
          Object.entries(data)
        );
      } else {
        placesPromise = Promise.resolve([]);
      }
    }

    Promise.all([statvarInfoPromise, placesPromise, validStatsVarPromise]).then(
      (values) => {
        for (let idx = 0; idx < urlVar.svId.length; idx++) {
          values[0][urlVar.svId[idx]].title = urlVar.svPath[idx].slice(-1)[0];
        }
        this.setState({
          statvarInfo: values[0],
          statvarPaths: urlVar.svPath,
          places: values[1],
          statvarValid: values[2],
          perCapita: urlVar.pc,
        });
      }
    );
  }

  _togglePerCapita() {
    updateUrl({ pc: !this.state.perCapita });
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
              search={this.props.search}
              svPaths={this.state.statvarPaths}
              svValid={this.state.statvarValid}
            ></Menu>
          </div>
        </div>
        <div id="plot-container">
          <div className="container">
            <div id="search">
              <SearchBar places={this.state.places} />
            </div>
            {this.state.places.length === 0 && <Info />}
            <div id="chart-region">
              <ChartRegion
                places={this.state.places}
                statVars={this.state.statvarInfo}
                perCapita={this.state.perCapita}
              ></ChartRegion>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export { Page };
