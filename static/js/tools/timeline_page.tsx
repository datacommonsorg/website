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
  getStatsVarInfo,
  getPlaceNames,
  getStatsVar,
  getTimelineParamsFromUrl,
  StatsVarNode,
} from "./timeline_util";
import { SearchBar } from "./timeline_search";
import { Menu } from "./statsvar_menu";
import { StatsVarInfo, TimelineParams } from "./timeline_util";
import { Info } from "./timeline_info";
import { ChartRegion } from "./timeline_chart_region";
import {
  NoopStatsVarFilter,
  TimelineStatsVarFilter,
  StatsVarFilterInterface,
} from "./commons";
import _ from "lodash";

interface PageStateType {
  statsVarNodes: StatsVarNode;
  statsVarInfo: { [key: string]: StatsVarInfo };
  placeIdNames: Record<string, string>; // [(placeId, placeName)]
  statsVarTitle: Record<string, string>;
  perCapita: boolean;
  statsVarValid: Set<string>;
}

class Page extends Component<Record<string, unknown>, PageStateType> {
  params: TimelineParams;

  constructor(props: Record<string, unknown>) {
    super(props);
    this.params = getTimelineParamsFromUrl();
    // set default statsVarTitle as the statsVar dcids
    const statsVarTitle = {};
    for (const statsVar of this.params.getStatsVarDcids()) {
      statsVarTitle[statsVar] = statsVar;
    }
    this.state = {
      placeIdNames: {},
      statsVarValid: new Set(),
      statsVarNodes: _.cloneDeep(this.params.statsVarNodes),
      statsVarInfo: {},
      statsVarTitle: statsVarTitle,
      perCapita: this.params.pc,
    };
  }

  componentDidMount(): void {
    // Initial rendering has emmpty state. This proactively parse the url hash
    // and re-render.
    let statsVarInfoPromise = Promise.resolve({});
    if (this.params.getStatsVarDcids().length !== 0) {
      statsVarInfoPromise = getStatsVarInfo(this.params.getStatsVarDcids());
    }
    let placesPromise = Promise.resolve({});
    let validStatsVarPromise = Promise.resolve(new Set<string>());
    if (this.params.placeDcids.length !== 0) {
      placesPromise = getPlaceNames(this.params.placeDcids);
      validStatsVarPromise = getStatsVar(this.params.placeDcids);
    }

    Promise.all([
      statsVarInfoPromise,
      placesPromise,
      validStatsVarPromise,
    ]).then(([statsVarInfo, placeIdNames, statsVarValid]) => {
      this.setState({
        statsVarInfo: statsVarInfo,
        placeIdNames: placeIdNames,
        statsVarValid: statsVarValid,
      });
    });
  }

  // add one statsVar with nodePath
  private addStatsVar(statsVar: string, nodePath: string[]): void {
    if (this.params.addStatsVar(statsVar, nodePath)) {
      const statsVarNode = _.cloneDeep(this.params.statsVarNodes)
      getStatsVarInfo(this.params.getStatsVarDcids()).then((data) => {
        this.setState({
          statsVarInfo: data,
          statsVarNodes: statsVarNode,
        });
      });
    }
  }

  // remove one statsVar with nodePath
  private removeStatsVar(statsVar: string, nodePath: string[] = []): void {
    if (this.params.removeStatsVar(statsVar, nodePath)) {
      const tempStatsVarInfo = this.state.statsVarInfo;
      if (!(statsVar in this.params.statsVarNodes)) {
        delete tempStatsVarInfo[statsVar];
      }
      this.setState({
        statsVarNodes: this.params.statsVarNodes,
        statsVarInfo: tempStatsVarInfo,
      });
    }
  }

  // add one place
  private addPlace(place: string): void {
    if (this.params.addPlace(place)) {
      const placesPromise = getPlaceNames(this.params.placeDcids);
      const validStatsVarPromise = getStatsVar(this.params.placeDcids);
      Promise.all([placesPromise, validStatsVarPromise]).then((values) => {
        this.setState({
          placeIdNames: values[0],
          statsVarValid: values[1],
        });
      });
    }
  }

  // remove one place
  private removePlace(place: string): void {
    if (this.params.removePLace(place)) {
      const tempPlace = this.state.placeIdNames;
      delete tempPlace[place];
      getStatsVar(this.params.placeDcids).then((data) => {
        this.setState({
          placeIdNames: tempPlace,
          statsVarValid: data,
        });
      });
    }
  }

  // change per capita
  private togglePerCapita(): void {
    this.setState({
      perCapita: !this.state.perCapita,
    });
  }

  // call back function passed down to menu for getting statsVar titles
  setStatsVarTitle(statsVarId2Title: Record<string, string>): void {
    this.setState({
      statsVarTitle: statsVarId2Title,
    });
  }

  render(): JSX.Element {
    let statsVarFilter: StatsVarFilterInterface;
    if (Object.keys(this.state.placeIdNames).length === 0) {
      statsVarFilter = new NoopStatsVarFilter();
    } else {
      statsVarFilter = new TimelineStatsVarFilter(this.state.statsVarValid);
    }
    return (
      <div>
        <div className="explore-menu-container" id="explore">
          <div id="drill-scroll-container">
            <div className="title">Select variables:</div>
            <span className="perCapita">Per capita</span>
            <button
              className={this.state.perCapita ? "checkbox checked" : "checkbox"}
              onClick={this.togglePerCapita.bind(this)}
            ></button>
            <Menu
              selectedNodes={this.state.statsVarNodes}
              statsVarFilter={statsVarFilter}
              setStatsVarTitle={this.setStatsVarTitle.bind(this)}
              addStatsVar={this.addStatsVar.bind(this)}
              removeStatsVar={this.removeStatsVar.bind(this)}
            ></Menu>
          </div>
        </div>
        <div id="plot-container">
          <div className="container">
            <div id="search">
              <SearchBar
                places={this.state.placeIdNames}
                addPlace={this.addPlace.bind(this)}
                removePlace={this.removePlace.bind(this)}
              />
            </div>
            {Object.keys(this.state.placeIdNames).length === 0 && <Info />}
            {Object.keys(this.state.placeIdNames).length !== 0 &&
              Object.keys(this.state.statsVarInfo).length !== 0 && (
                <div id="chart-region">
                  <ChartRegion
                    places={this.state.placeIdNames}
                    statsVars={this.state.statsVarInfo}
                    perCapita={this.state.perCapita}
                    statsVarTitle={this.state.statsVarTitle}
                    removeStatsVar={this.removeStatsVar.bind(this)}
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
