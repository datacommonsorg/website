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
  getPlaceNames,
  getTokensFromUrl,
  addToken,
  removeToken,
  statVarSep,
  placeSep,
} from "./util";
import { getStatVarInfo, StatVarInfo } from "../statvar_menu/util";
import { SearchBar } from "./search";
import { Info } from "./info";
import { ChartRegion } from "./chart_region";

import { StatVarHierarchyType, NamedPlace } from "../../shared/types";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";

interface PageStateType {
  placeName: Record<string, string>;
  statVarInfo: Record<string, StatVarInfo>;
}

class Page extends Component<unknown, PageStateType> {
  constructor(props: unknown) {
    super(props);
    this.fetchDataAndRender = this.fetchDataAndRender.bind(this);
    this.state = {
      placeName: {},
      statVarInfo: {},
    };
  }

  componentDidMount(): void {
    window.addEventListener("hashchange", this.fetchDataAndRender);
    this.fetchDataAndRender();
  }

  private fetchDataAndRender(): void {
    const statVars = Array.from(getTokensFromUrl("statVar", statVarSep));
    const places = Array.from(getTokensFromUrl("place", placeSep));

    let statVarInfoPromise = Promise.resolve({});
    if (statVars.length !== 0) {
      statVarInfoPromise = getStatVarInfo(statVars);
    }
    let placesPromise = Promise.resolve({});
    if (places.length !== 0) {
      placesPromise = getPlaceNames(places);
    }
    Promise.all([statVarInfoPromise, placesPromise]).then(
      ([statVarInfo, placeName]) => {
        this.setState({
          statVarInfo,
          placeName,
        });
      }
    );
  }

  render(): JSX.Element {
    const numPlaces = Object.keys(this.state.placeName).length;
    const numStatVarInfo = Object.keys(this.state.statVarInfo).length;
    const namedPlaces: NamedPlace[] = [];
    for (const place in this.state.placeName) {
      namedPlaces.push({ dcid: place, name: this.state.placeName[place] });
    }
    const statVars = Array.from(getTokensFromUrl("statVar", statVarSep));
    return (
      <div>
        <div className="stat-var-hierarchy-container" id="explore">
          <div id="drill-scroll-container">
            <div className="title">Select variables:</div>
            <StatVarHierarchy
              type={StatVarHierarchyType.TIMELINE}
              places={namedPlaces}
              selectedSVs={statVars}
              selectSV={(sv) => {
                addToken("statVar", statVarSep, sv);
              }}
              deselectSV={(sv) => {
                removeToken("statVar", statVarSep, sv);
              }}
            />
          </div>
        </div>
        <div id="plot-container">
          <div className="container">
            {numPlaces === 0 && <h1 className="mb-4">Timelines Explorer</h1>}
            <div id="search">
              <SearchBar
                places={this.state.placeName}
                addPlace={(place) => {
                  addToken("place", placeSep, place);
                }}
                removePlace={(place) => {
                  removeToken("place", placeSep, place);
                }}
              />
            </div>
            {numPlaces === 0 && <Info />}
            {numPlaces !== 0 && numStatVarInfo !== 0 && (
              <div id="chart-region">
                <ChartRegion
                  placeName={this.state.placeName}
                  statVarInfo={this.state.statVarInfo}
                ></ChartRegion>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export { Page };
