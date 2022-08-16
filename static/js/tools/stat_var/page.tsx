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

import {
  NamedPlace,
  StatVarHierarchyType,
  StatVarSummary,
} from "../../shared/types";
import { StatVarWidget } from "../shared/stat_var_widget";
import { DatasetSelector } from "./dataset_selector";
import { Explorer } from "./explorer";
import { Info } from "./info";
import {
  DATASET_PARAM,
  getUrlToken,
  SOURCE_PARAM,
  SV_PARAM,
  updateHash,
} from "./util";

const SOURCE_PREFIX = "dc/s/";
const DATASET_PREFIX = "dc/d/";

interface PageStateType {
  // DCID of selected dataset.
  dataset: string;
  description: string;
  displayName: string;
  // Sources/dataset to filter by.
  entity: NamedPlace[];
  error: boolean;
  // DCID of selected source.
  source: string;
  // Map of source name to dcid.
  sourceMap: Record<string, string>;
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
      dataset: "",
      description: "",
      displayName: "",
      entity: [],
      error: false,
      source: "",
      sourceMap: {},
      statVar: "",
      summary: { placeTypeSummary: {} },
      urls: {},
      showSvHierarchyModal: false,
    };
    this.toggleSvHierarchyModal = this.toggleSvHierarchyModal.bind(this);
  }

  async componentDidMount(): Promise<void> {
    const handleHashChange = () => {
      const dataset = getUrlToken(DATASET_PARAM);
      const source = getUrlToken(SOURCE_PARAM);
      const sv = getUrlToken(SV_PARAM);
      if (dataset && dataset !== this.state.dataset) {
        this.updateEntity(dataset);
      } else if (source !== this.state.source) {
        if (dataset) {
          // Changing a source should clear existing dataset.
          updateHash({ [DATASET_PARAM]: "" });
        } else {
          this.updateEntity(source);
        }
      } else if (dataset !== this.state.dataset) {
        // If dataset changes to empty, revert to full source.
        this.updateEntity(source);
      }
      if (sv !== this.state.statVar) {
        this.fetchSummary();
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    axios
      .get("/api/browser/propvals/typeOf/Source")
      .then((resp) => {
        const sourceDcids = [];
        for (const source of resp.data?.values?.in) {
          sourceDcids.push(source.dcid);
        }
        if (sourceDcids.length === 0) {
          return;
        }
        axios
          .get(`/api/stats/propvals/name/${sourceDcids.join("^")}`)
          .then((resp) => {
            const sourceMap = {};
            for (const dcid in resp.data) {
              sourceMap[resp.data[dcid][0]] = dcid;
            }
            this.setState({ sourceMap });
          });
      })
      .catch(() => {
        alert("Error fetching data.");
      });
  }

  private toggleSvHierarchyModal(): void {
    this.setState({
      showSvHierarchyModal: !this.state.showSvHierarchyModal,
    });
  }

  render(): JSX.Element {
    const svs = this.state.statVar ? { [this.state.statVar]: {} } : {};
    return (
      <>
        <StatVarWidget
          openSvHierarchyModal={this.state.showSvHierarchyModal}
          openSvHierarchyModalCallback={this.toggleSvHierarchyModal}
          collapsible={false}
          svHierarchyType={StatVarHierarchyType.STAT_VAR}
          samplePlaces={this.state.entity}
          deselectSVs={() => updateHash({ [SV_PARAM]: "" })}
          selectedSVs={svs}
          selectSV={(sv) => updateHash({ [SV_PARAM]: sv })}
          disableAlert={true}
        />
        <div id="plot-container">
          <div className="container">
            <h1 className="mb-4">Statistical Variable Explorer</h1>
            <DatasetSelector sourceMap={this.state.sourceMap} />
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

  private async fetchSummary(): Promise<void> {
    const sv = getUrlToken(SV_PARAM);
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
    const descriptionPromise = axios
      .get(`/api/stats/propvals/description/${sv}`)
      .then((resp) => resp.data);
    const displayNamePromise = axios
      .get(`/api/stats/propvals/name/${sv}`)
      .then((resp) => resp.data);
    const summaryPromise = axios
      .post("/api/stats/stat-var-summary", { statVars: [sv] })
      .then((resp) => resp.data);
    Promise.all([descriptionPromise, displayNamePromise, summaryPromise])
      .then(([descriptionResult, displayNameResult, summaryResult]) => {
        const provIds = [];
        for (const provId in summaryResult[sv]?.provenanceSummary) {
          provIds.push(provId);
        }
        if (provIds.length === 0) {
          return;
        }
        axios
          .get(`/api/stats/propvals/url/${provIds.join("^")}`)
          .then((resp) => {
            this.setState({
              description:
                descriptionResult[sv].length > 0
                  ? descriptionResult[sv][0]
                  : "",
              displayName: displayNameResult[sv][0],
              error: false,
              statVar: sv,
              summary: summaryResult[sv],
              urls: resp.data,
            });
          });
      })
      .catch(() => {
        this.setState({
          error: true,
          statVar: sv,
        });
      });
  }

  private async updateEntity(dcid: string): Promise<void> {
    if (!dcid) {
      this.setState({ entity: [] });
      return;
    }
    axios
      .get(`/api/stats/propvals/name/${dcid}`)
      .then((resp) => {
        const name = resp.data[dcid][0];
        this.setState({
          dataset: dcid.startsWith(DATASET_PREFIX) ? dcid : this.state.dataset,
          entity: [
            {
              name,
              dcid,
            },
          ],
          source: dcid.startsWith(SOURCE_PREFIX) ? dcid : this.state.source,
        });
      })
      .catch(() => {
        this.setState({
          dataset: "",
          entity: [],
          source: "",
        });
      });
  }
}

export { Page };
