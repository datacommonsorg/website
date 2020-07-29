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
import { ChartRegion, StatsVarInfo } from "./timeline_chart";
import { Info } from "./timeline_info";

interface PagePropType {
  search: boolean;
}

interface PageStateType {
  statsVarPaths: number[][];
  statsVarInfo: { [key: string]: StatsVarInfo };
  places: [string, string][]; // [(placeId, placeName)]
  perCapita: boolean;
  statsVarValid: Set<string>;
}

class Page extends Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.handleHashChange = this.handleHashChange.bind(this);
    this._togglePerCapita = this._togglePerCapita.bind(this);
    this.setStatsVarNames = this.setStatsVarNames.bind(this);
    this.state = {
      statsVarPaths: [],
      statsVarInfo: {},
      places: [],
      perCapita: false,
      statsVarValid: new Set(),
    };
  }

  componentDidMount() {
    window.addEventListener("hashchange", this.handleHashChange);
    this.handleHashChange();
  }

  handleHashChange() {
    const urlVar = parseUrl();

    let statsVarInfoPromise = Promise.resolve(this.state.statsVarInfo);
    if (urlVar.statsVarPath !== this.state.statsVarPaths) {
      if (urlVar.statsVarId.length !== 0) {
        statsVarInfoPromise = getStatsVarInfo(urlVar.statsVarId);
      } else {
        statsVarInfoPromise = Promise.resolve({});
      }
    }

    let placesPromise = Promise.resolve(this.state.places);
    let validStatsVarPromise = Promise.resolve(this.state.statsVarValid);
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

    Promise.all([
      statsVarInfoPromise,
      placesPromise,
      validStatsVarPromise,
    ]).then((values) => {
      this.setState({
        statsVarInfo: values[0],
        statsVarPaths: urlVar.statsVarPath,
        places: values[1],
        statsVarValid: values[2],
        perCapita: urlVar.pc,
      });
    });
  }

  _togglePerCapita() {
    updateUrl({ pc: !this.state.perCapita });
    this.setState({
      perCapita: !this.state.perCapita,
    });
  }

  setStatsVarNames(statsVarId: string, statsVarName: string) {
    const value = this.state.statsVarInfo;
    value[statsVarId].title = statsVarName;
    this.setState({
      statsVarInfo: value,
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
              statsVarPaths={this.state.statsVarPaths}
              statsVarValid={this.state.statsVarValid}
              filter={this.state.places.length !== 0}
              setName={this.setStatsVarNames}
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
                statsVars={this.state.statsVarInfo}
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
