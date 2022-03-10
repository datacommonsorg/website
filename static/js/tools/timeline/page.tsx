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

import axios from "axios";
import _ from "lodash";
import React, { Component } from "react";

import { getStatVarInfo, StatVarInfo } from "../../shared/stat_var";
import { NamedPlace, StatVarHierarchyType } from "../../shared/types";
import { DrawerToggle } from "../../stat_var_hierarchy/drawer_toggle";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";
import { ChartRegion } from "./chart_region";
import { Info } from "./info";
import { SearchBar } from "./search";
import {
  addToken,
  getPlaceNames,
  getTokensFromUrl,
  placeSep,
  removeToken,
  setTokensToUrl,
  statVarSep,
} from "./util";

interface PageStateType {
  placeName: Record<string, string>;
  statVarInfo: Record<string, StatVarInfo>;
}

class Page extends Component<unknown, PageStateType> {
  constructor(props: unknown) {
    super(props);
    this.fetchDataAndRender = this.fetchDataAndRender.bind(this);
    this.addPlaceAction = this.addPlaceAction.bind(this);
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
    const places = Array.from(getTokensFromUrl("place", placeSep));
    const statVars = Array.from(getTokensFromUrl("statsVar", statVarSep));
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
        // Schemaless stat vars are not associated with any triples.
        // Assign the measured property to be the DCID so the chart can be
        // grouped (by measured property).
        for (const statVar of statVars) {
          if (!(statVar in statVarInfo)) {
            statVarInfo[statVar] = { mprop: statVar };
          }
        }
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
    const statVarTokens = Array.from(getTokensFromUrl("statsVar", statVarSep));
    const statVars = statVarTokens.map((sv) =>
      sv.includes("|") ? sv.split("|")[0] : sv
    );
    return (
      <>
        <div className="explore-menu-container" id="explore">
          <DrawerToggle
            collapseElemId="explore"
            visibleElemId="stat-var-hierarchy-section"
          />
          <StatVarHierarchy
            type={StatVarHierarchyType.TIMELINE}
            places={namedPlaces}
            selectedSVs={statVars}
            selectSV={(sv) => {
              addToken("statsVar", statVarSep, sv);
            }}
            deselectSV={(sv) => {
              removeToken("statsVar", statVarSep, sv);
            }}
            searchLabel="Statistical Variables"
          />
        </div>
        <div id="plot-container">
          <div className="container-fluid">
            {numPlaces === 0 && <h1 className="mb-4">Timelines Explorer</h1>}
            <SearchBar
              places={this.state.placeName}
              addPlace={(place) => {
                this.addPlaceAction(place);
              }}
              removePlace={(place) => {
                removeToken("place", placeSep, place);
              }}
            />
            {numPlaces === 0 && <Info />}
            {numPlaces !== 0 && numStatVarInfo !== 0 && (
              <div id="chart-region">
                <ChartRegion
                  placeName={this.state.placeName}
                  statVarInfo={this.state.statVarInfo}
                  statVarOrder={statVars}
                ></ChartRegion>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  private addPlaceAction(place: string): void {
    // We only need to check the availability of selected stat vars when adding
    // the first place (ie. when the current list of places is empty) because
    // we take the union of the eligible stat vars for all places.
    if (!_.isEmpty(this.state.statVarInfo) && _.isEmpty(this.state.placeName)) {
      axios
        .post("/api/place/stat-vars/union", {
          dcids: [place],
          statVars: Object.keys(this.state.statVarInfo),
        })
        .then((resp) => {
          const availableSVs: string[] = resp.data;
          const unavailableSV = [];
          for (const sv in this.state.statVarInfo) {
            if (availableSVs.indexOf(sv) === -1) {
              unavailableSV.push(this.state.statVarInfo[sv].title || sv);
            }
          }
          const placeTokenInfo = {
            name: "place",
            sep: placeSep,
            tokens: new Set([place]),
          };
          const statVarTokenInfo = {
            name: "statsVar",
            sep: statVarSep,
            tokens: new Set(availableSVs),
          };
          setTokensToUrl([placeTokenInfo, statVarTokenInfo]);
          if (!_.isEmpty(unavailableSV)) {
            alert(
              `Sorry, the selected variable(s) [${unavailableSV.join(", ")}] ` +
                "are not available for the chosen place."
            );
          }
        })
        .catch(() => addToken("place", placeSep, place));
    } else {
      addToken("place", placeSep, place);
    }
  }
}

export { Page };
