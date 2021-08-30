/**
 * Copyright 2021 Google LLC
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
import React, { Component } from "react";
import { Explorer } from "./explorer";
import { Info } from "./info";
import { StatVarHierarchyType, StatVarSummary } from "../../shared/types";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";

interface PageStateType {
  displayName: string;
  statVar: string;
  summary: StatVarSummary;
}

class Page extends Component<unknown, PageStateType> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      displayName: "",
      statVar: "",
      summary: { placeTypeSummary: {} },
    };
  }

  componentDidMount(): void {
    window.onhashchange = () => {
      this.fetchSummary();
    };
    this.fetchSummary();
  }

  render(): JSX.Element {
    return (
      <>
        <div className="explore-menu-container" id="explore">
          <StatVarHierarchy
            type={StatVarHierarchyType.STAT_VAR}
            places={[]}
            selectedSVs={[this.state.statVar]}
            selectSV={(sv) => {
              this.updateHash(sv);
            }}
            searchLabel="Statistical Variables"
          />
        </div>
        <div id="plot-container">
          <div className="container">
            {!this.state.statVar && <Info />}
            {this.state.statVar && (
              <Explorer
                statVar={this.state.statVar}
                displayName={this.state.displayName}
                summary={this.state.summary}
              />
            )}
          </div>
        </div>
      </>
    );
  }

  private updateHash(sv: string): void {
    const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
    urlParams.set("statVar", sv);
    window.location.hash = urlParams.toString();
  }

  private fetchSummary(): void {
    const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
    const sv = urlParams.get("statVar");
    if (!sv) {
      this.setState({
        displayName: "",
        statVar: "",
        summary: { placeTypeSummary: {} },
      });
      return;
    }
    const displayNamePromise = axios
      .get(`/api/browser/propvals/name/${sv}`)
      .then((resp) => resp.data);
    const summaryPromise = axios
      .post(`/api/stats/stat-var-summary`, { statVars: [sv] })
      .then((resp) => resp.data);
    Promise.all([displayNamePromise, summaryPromise])
      .then(([displayNameData, summaryData]) => {
        this.setState({
          displayName: displayNameData["values"]["out"][0]["value"],
          statVar: sv,
          summary: summaryData[sv],
        });
      })
      .catch(() => {
        alert("Error fetching data.");
      });
  }
}

export { Page };
