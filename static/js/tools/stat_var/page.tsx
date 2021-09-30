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

/**
 * Top-level wrapper component for Stat Var Explorer page.
 */

import axios from "axios";
import React, { Component } from "react";
import { Explorer } from "./explorer";
import { Info } from "./info";
import { StatVarHierarchyType, StatVarSummary } from "../../shared/types";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";

interface PageStateType {
  description: string;
  displayName: string;
  error: boolean;
  statVar: string;
  summary: StatVarSummary;
  urls: Record<string, string>;
}

class Page extends Component<unknown, PageStateType> {
  constructor(props: unknown) {
    super(props);
    this.state = {
      description: "",
      displayName: "",
      error: false,
      statVar: "",
      summary: { placeTypeSummary: {} },
      urls: {},
    };
  }

  async componentDidMount(): Promise<void> {
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
            {this.state.error && this.state.statVar && (
              <div>Error fetching data for {this.state.statVar}.</div>
            )}
            {!this.state.error && this.state.statVar && (
              <Explorer
                description={this.state.description}
                displayName={this.state.displayName}
                statVar={this.state.statVar}
                summary={this.state.summary}
                urls={this.state.urls}
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

  private async fetchSummary(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
    const sv = urlParams.get("statVar");
    if (!sv) {
      this.setState({
        description: "",
        displayName: "",
        error: false,
        statVar: "",
        summary: { placeTypeSummary: {} },
        urls: {},
      });
      return;
    }
    const [
      descriptionPromise,
      displayNamePromise,
      summaryPromise,
    ] = await Promise.all([
      axios.get(`/api/stats/propvals/description/${sv}`),
      axios.get(`/api/stats/propvals/name/${sv}`),
      axios.post("/api/stats/stat-var-summary", { statVars: [sv] }),
    ]);
    if (!displayNamePromise.data[sv].length) {
      this.setState({
        error: true,
        statVar: sv,
      });
      return;
    }
    const provIds = [];
    for (const provId in summaryPromise.data[sv]?.provenanceSummary) {
      provIds.push(provId);
    }
    const urlsPromise =
      provIds.length > 0
        ? await axios.get(`/api/stats/propvals/url/${provIds.join("^")}`)
        : undefined;
    this.setState({
      description:
        descriptionPromise.data[sv].length > 0
          ? descriptionPromise.data[sv][0]
          : "",
      displayName: displayNamePromise.data[sv][0],
      error: false,
      statVar: sv,
      summary: summaryPromise.data[sv],
      urls: urlsPromise?.data,
    });
  }
}

export { Page };
