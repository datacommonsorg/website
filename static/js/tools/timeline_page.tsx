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
  getStatsVarProp,
  getPlaceNames,
} from "./timeline_util";
import { SearchBar } from "./timeline_search";
import { Menu } from "./statsvar_menu";
import { ChartRegion } from "./timeline_chart";

interface PagePropType {
  search: boolean;
  updateUrl: (statvar: string, shouldAdd: boolean) => void;
}

interface PageStateType {
  statvarPaths: string[][];
  svTriples: {};
  placeList: { [key: string]: string } /*{placeId: placeName}*/;
  perCapita: boolean;
}

class Page extends Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.handleHashChange = this.handleHashChange.bind(this);
    this._togglePerCapita = this._togglePerCapita.bind(this);
    this.state = {
      statvarPaths: [],
      svTriples: {},
      placeList: {},
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
    if (svPaths !== this.state.statvarPaths) {
      if (svIds.length !== 0) {
        const triplesPromise = getStatsVarProp(svIds);
        triplesPromise.then((triples) => {
          this.setState({
            svTriples: triples,
            statvarPaths: svPaths,
          });
        });
      } else {
        this.setState({
          svTriples: {},
          statvarPaths: [],
        });
      }
    }
    const placeIds = parsePlace();
    if (placeIds !== Object.keys(this.state.placeList)) {
      if (placeIds.length !== 0) {
        const placesPromise = getPlaceNames(placeIds);
        placesPromise.then((places) => {
          this.setState({
            placeList: places,
          });
        });
      } else {
        this.setState({
          placeList: {},
        });
      }
    }
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
              <SearchBar placeList={this.state.placeList} />
            </div>
            {/* <div id="observation" style="display: block;">
              <div id="chart-region">
                 <ChartRegion
                  chartElem="charts"
                  places={this.state.placeList}
                  statVarsAndMeasuredProps={[
                    ["Count_Person", "count"],
                    ["Count_Person_Male", "count"],
                    ["Median_Age_Person", "age"],
                  ]}
                  perCapita={false}
                ></ChartRegion>
               </div>
            </div>  */}
          </div>
        </div>
      </div>
    );
  }
}
export { Page };
