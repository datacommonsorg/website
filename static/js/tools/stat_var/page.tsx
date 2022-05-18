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
import { Button } from "reactstrap";

import { StatVarHierarchyType, StatVarSummary } from "../../shared/types";
import { StatVarWidget } from "../shared/stat_var_widget";
import { Explorer } from "./explorer";
import { Info } from "./info";

interface PageStateType {
  description: string;
  displayName: string;
  error: boolean;
  statVar: string;
  summary: StatVarSummary;
  urls: Record<string, string>;
  // Whether the SV Hierarchy Modal is opened.
  showSvHierarchyModal: boolean;
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
      showSvHierarchyModal: false,
    };
    this.toggleSvHierarchyModal = this.toggleSvHierarchyModal.bind(this);
  }

  async componentDidMount(): Promise<void> {
    window.onhashchange = () => {
      this.fetchSummary();
    };
    this.fetchSummary();
  }

  private toggleSvHierarchyModal(): void {
    this.setState({
      showSvHierarchyModal: !this.state.showSvHierarchyModal,
    });
  }

  render(): JSX.Element {
    const svHierarchyProps = {
      places: [],
      selectSV: (sv) => this.updateHash(sv),
      selectedSVs: [this.state.statVar],
      type: StatVarHierarchyType.STAT_VAR,
    };
    return (
      <>
        <StatVarWidget
          openSvHierarchyModal={this.state.showSvHierarchyModal}
          openSvHierarchyModalCallback={this.toggleSvHierarchyModal}
          svHierarchyProps={svHierarchyProps}
          collapsible={false}
        />
        <div id="plot-container">
          <div className="container">
            {!this.state.statVar && (
              <>
                <Info />
                <Button
                  className="d-lg-none"
                  color="primary"
                  onClick={this.toggleSvHierarchyModal}
                >
                  Select variable
                </Button>
              </>
            )}
            {this.state.error && this.state.statVar && (
              <div>Error fetching data for {this.state.statVar}.</div>
            )}
            {!this.state.error && this.state.statVar && (
              <>
                <Explorer
                  description={this.state.description}
                  displayName={this.state.displayName}
                  statVar={this.state.statVar}
                  summary={this.state.summary}
                  urls={this.state.urls}
                >
                  <div className="d-lg-none pt-3">
                    <Button
                      color="primary"
                      onClick={this.toggleSvHierarchyModal}
                    >
                      Explore another variable
                    </Button>
                  </div>
                </Explorer>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  private updateHash(sv: string): void {
    window.location.hash = `#${sv}`;
  }

  private async fetchSummary(): Promise<void> {
    const sv = window.location.hash.split("#")[1];
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
