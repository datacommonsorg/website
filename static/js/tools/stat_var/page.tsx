/**
 * Copyright 2023 Google LLC
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

import { PropertyValues } from "../../shared/api_response_types";
import {
  NamedNode,
  StatVarHierarchyType,
  StatVarSummary,
} from "../../shared/types";
import { stringifyFn } from "../../utils/axios";
import { StatVarWidget } from "../shared/stat_var_widget";
import { DatasetSelector } from "./dataset_selector";
import { Explorer } from "./explorer";
import { Info } from "./info";
import { getUrlToken, SV_URL_PARAMS, updateHash } from "./util";

const SVG_URL_PREFIX = "/api/variable-group/info?dcid=dc/g/Root&entities=";

interface PageStateType {
  // DCID of selected dataset.
  dataset: string;
  // DCID and name current datasets.
  datasets: NamedNode[];
  description: string;
  displayName: string;
  // Source or dataset to filter by.
  entity: NamedNode;
  error: boolean;
  // DCID of selected source.
  source: string;
  // DCID and name of sources.
  sources: NamedNode[];
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
      datasets: [],
      description: "",
      displayName: "",
      entity: { dcid: "", name: "" },
      error: false,
      source: "",
      sources: [],
      statVar: "",
      summary: { placeTypeSummary: {} },
      urls: {},
      showSvHierarchyModal: false,
    };
    this.toggleSvHierarchyModal = this.toggleSvHierarchyModal.bind(this);
  }

  private handleHashChange = () => {
    const dataset = getUrlToken(SV_URL_PARAMS.DATASET);
    const source = getUrlToken(SV_URL_PARAMS.SOURCE);
    const sv = getUrlToken(SV_URL_PARAMS.STAT_VAR);
    if (dataset !== this.state.dataset || source !== this.state.source) {
      this.updateEntity(source, dataset);
    }
    if (sv !== this.state.statVar) {
      this.fetchSummary(sv);
    }
  };

  async componentDidMount(): Promise<void> {
    window.addEventListener("hashchange", this.handleHashChange);
    this.handleHashChange();
    this.fetchSources();
  }

  private toggleSvHierarchyModal(): void {
    this.setState({
      showSvHierarchyModal: !this.state.showSvHierarchyModal,
    });
  }

  render(): JSX.Element {
    const svs = this.state.statVar ? { [this.state.statVar]: {} } : {};
    const entities = this.state.entity.dcid ? [this.state.entity] : [];
    return (
      <>
        <StatVarWidget
          openSvHierarchyModal={this.state.showSvHierarchyModal}
          openSvHierarchyModalCallback={this.toggleSvHierarchyModal}
          collapsible={false}
          svHierarchyType={StatVarHierarchyType.STAT_VAR}
          sampleEntities={entities}
          deselectSVs={() => updateHash({ [SV_URL_PARAMS.STAT_VAR]: "" })}
          selectedSVs={svs}
          selectSV={(sv) => updateHash({ [SV_URL_PARAMS.STAT_VAR]: sv })}
          disableAlert={true}
        />
        <div id="plot-container">
          <div className="container">
            <h1 className="mb-4">Statistical Variable Explorer</h1>
            <DatasetSelector
              dataset={this.state.dataset}
              datasets={this.state.datasets}
              source={this.state.source}
              sources={this.state.sources}
            />
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

  /**
   * Fetches sources to display in dropdown menu.
   */
  private fetchSources(): void {
    axios
      .get<PropertyValues>("/api/node/propvals/in?prop=typeOf&dcids=Source")
      .then((resp) => {
        const sourcePromises = [];
        if (!resp.data["Source"]) {
          return;
        }
        for (const source of resp.data["Source"]) {
          const url = SVG_URL_PREFIX + source.dcid;
          sourcePromises.push(axios.get(url).then((resp) => resp));
        }
        if (sourcePromises.length === 0) {
          return;
        }
        Promise.all(sourcePromises).then((sourceResults) => {
          const sourceDcids = [];
          for (const result of sourceResults) {
            // Filter out all sources which have no stat vars in the main hierarchy (e.g. BMDC).
            // TODO: Use ENTITY in schema to identify sources with stats
            if (result.data.descendentStatVarCount) {
              sourceDcids.push(
                result?.config?.url.replace([SVG_URL_PREFIX], "")
              );
            }
          }
          if (sourceDcids.length === 0) {
            return;
          }
          axios
            .get<PropertyValues>("/api/node/propvals/out", {
              params: { dcids: sourceDcids, prop: "name" },
              paramsSerializer: stringifyFn,
            })
            .then((resp) => {
              const sources = [];
              for (const dcid of Object.keys(resp.data).sort()) {
                sources.push({
                  dcid,
                  name: resp.data[dcid][0]["value"],
                });
              }
              this.setState({ sources });
            });
        });
      })
      .catch(() => {
        alert("Error fetching data.");
      });
  }

  /**
   * Updates entity for current source and dataset and also sets datasets based on source.
   * @param source DCID of source
   * @param dataset DCID of dataset
   */
  private updateEntity(source: string, dataset: string): void {
    if (!source) {
      this.setState({
        dataset: "",
        datasets: [],
        entity: { dcid: "", name: "" },
        source: "",
      });
      return;
    }
    axios
      .get<PropertyValues>(
        `/api/node/propvals/in?prop=isPartOf&dcids=${source}`
      )
      .then((resp) => {
        const currentDatasets = [];
        const datasetSet = new Set();
        if (!resp.data[source]) {
          return;
        }
        for (const dataset of resp.data[source]) {
          // Remove duplicates.
          if (datasetSet.has(dataset.dcid)) {
            continue;
          }
          currentDatasets.push({
            dcid: dataset.dcid,
            name: dataset.name,
          });
          datasetSet.add(dataset.dcid);
        }
        currentDatasets.sort((a, b): number => {
          return a.name.localeCompare(b.name);
        });
        let dcid = source;
        if (dataset && currentDatasets.some((d) => d.dcid === dataset)) {
          dcid = dataset;
        }
        axios
          .get<PropertyValues>("/api/node/propvals/out", {
            params: { dcids: [dcid], prop: "name" },
            paramsSerializer: stringifyFn,
          })
          .then((resp) => {
            const name = resp.data[dcid][0]["value"];
            this.setState({
              dataset,
              datasets: currentDatasets,
              entity: {
                dcid,
                name,
              },
              source,
            });
          })
          .catch(() => {
            this.setState({
              dataset,
              datasets: currentDatasets,
              entity: { dcid: "", name: "" },
              source,
            });
          });
      })
      .catch(() => {
        this.setState({
          dataset,
          datasets: [],
          entity: { dcid: "", name: "" },
          source,
        });
      });
  }

  /**
   * Fetches StatVarSummary for selected stat var.
   * @param sv DCID of stat var
   */
  private fetchSummary(sv: string): void {
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
      .get<PropertyValues>("/api/node/propvals/out", {
        params: { dcids: [sv], prop: "description" },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => resp.data);
    const displayNamePromise = axios
      .get<PropertyValues>("/api/node/propvals/out", {
        params: { dcids: [sv], prop: "name" },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => resp.data);
    const summaryPromise = axios
      .get("/api/variable/info", {
        params: {
          dcids: [sv],
        },
        paramsSerializer: stringifyFn,
      })
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
          .get<PropertyValues>("/api/node/propvals/out", {
            params: { dcids: provIds, prop: "url" },
            paramsSerializer: stringifyFn,
          })
          .then((resp) => {
            const urlMap = {};
            for (const dcid in resp.data) {
              urlMap[dcid] = resp.data[dcid][0].value;
            }
            const description =
              descriptionResult[sv].length > 0
                ? descriptionResult[sv][0]["value"]
                : "";
            let displayName =
              displayNameResult[sv].length > 0
                ? displayNameResult[sv][0]["value"]
                : "";
            displayName = displayName || description;
            this.setState({
              description,
              displayName,
              error: false,
              statVar: sv,
              summary: summaryResult[sv],
              urls: urlMap,
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
}

export { Page };
