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

/**
 * Main component for browser.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { GoogleMap } from "../components/google_map";
import { StatVarHierarchyType } from "../shared/types";
import { StatVarHierarchy } from "../stat_var_hierarchy/stat_var_hierarchy";
import { ImageSection } from "./image_section";
import { InArcSection } from "./in_arc_section";
import { ObservationChartSection } from "./observation_chart_section";
import { OutArcSection } from "./out_arc_section";
import { PageDisplayType } from "./types";

const URL_PREFIX = "/browser/";
const PLACE_STAT_VAR_PROPERTIES_HEADER = "Statistical Variable Properties";
const GENERAL_PROPERTIES_HEADER = "Properties";
const SELECTED_SV_SEP = "__";

interface BrowserPagePropType {
  dcid: string;
  nodeName: string;
  pageDisplayType: PageDisplayType;
  statVarId: string;
  nodeTypes: string[];
  shouldShowStatVarHierarchy: boolean;
}

interface BrowserPageStateType {
  provDomain: { [key: string]: URL };
  dataFetched: boolean;
  inLabels: string[];
  outLabels: string[];
}

export class BrowserPage extends React.Component<
  BrowserPagePropType,
  BrowserPageStateType
> {
  constructor(props: BrowserPagePropType) {
    super(props);
    this.state = {
      dataFetched: false,
      inLabels: [],
      outLabels: [],
      provDomain: {},
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (!this.state.dataFetched) {
      return null;
    }
    const showInArcSection =
      this.props.pageDisplayType !== PageDisplayType.PLACE_STAT_VAR &&
      !_.isEmpty(this.state.inLabels);
    const outArcHeader =
      this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR
        ? PLACE_STAT_VAR_PROPERTIES_HEADER
        : GENERAL_PROPERTIES_HEADER;
    const arcDcid = this.getArcDcid();
    const urlParams = new URLSearchParams(window.location.search);
    let selectedSVs = [];
    const selectedSvString = urlParams.get("openSv") || "";
    if (selectedSvString) {
      selectedSVs = selectedSvString.split(SELECTED_SV_SEP);
    }
    const showAllProperties = !!urlParams.get("all");
    return (
      <>
        {this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR && (
          <h1 className="browser-page-header">
            Statistical Variable:{" "}
            <a href={URL_PREFIX + this.props.statVarId}>
              {this.props.statVarId}
            </a>
          </h1>
        )}
        <h1 className="browser-page-header">
          About:{" "}
          {this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR ? (
            <a href={URL_PREFIX + this.props.dcid}>{this.props.nodeName}</a>
          ) : (
            <>{this.props.nodeName}</>
          )}
        </h1>
        {this.props.pageDisplayType !== PageDisplayType.PLACE_STAT_VAR && (
          <>
            <h2 className="browser-header-subtitle">dcid: {this.props.dcid}</h2>
            <h2 className="browser-header-subtitle">
              typeOf: {this.props.nodeTypes.join(", ")}
            </h2>
          </>
        )}
        <div id="overview-map">
          <GoogleMap dcid={this.props.dcid}></GoogleMap>
        </div>
        <div id="node-content">
          <div className="table-page-section">
            <h3>{outArcHeader}</h3>
            <OutArcSection
              dcid={arcDcid}
              labels={this.state.outLabels}
              provDomain={this.state.provDomain}
              nodeTypes={this.props.nodeTypes}
              showAllProperties={showAllProperties}
            />
          </div>
          {this.props.shouldShowStatVarHierarchy && (
            <div className="table-page-section">
              <h3>Statistical Variables</h3>
              <div className="card">
                <StatVarHierarchy
                  type={StatVarHierarchyType.BROWSER}
                  entities={[
                    { dcid: this.props.dcid, name: this.props.nodeName },
                  ]}
                  selectedSVs={selectedSVs}
                />
              </div>
            </div>
          )}
          {showInArcSection && (
            <div className="table-page-section">
              <h3>In Arcs</h3>
              <InArcSection
                nodeName={this.props.nodeName}
                dcid={this.props.dcid}
                labels={this.state.inLabels}
                provDomain={this.state.provDomain}
              />
            </div>
          )}
          {this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR && (
            <div className="table-page-section">
              <h3>{`Observations for ${this.props.nodeName}`}</h3>
              <ObservationChartSection
                placeDcid={this.props.dcid}
                statVarId={this.props.statVarId}
                placeName={this.props.nodeName}
              />
            </div>
          )}
          {this.props.pageDisplayType ===
            PageDisplayType.BIOLOGICAL_SPECIMEN && (
            <div className="table-page-section">
              <h3>Image</h3>
              <ImageSection dcid={this.props.dcid} />
            </div>
          )}
        </div>
      </>
    );
  }

  private getArcDcid(): string {
    return this.props.pageDisplayType === PageDisplayType.PLACE_STAT_VAR
      ? this.props.statVarId
      : this.props.dcid;
  }

  private fetchData(): void {
    const provenancePromise = axios
      .get("/api/browser/provenance")
      .then((resp) => resp.data);
    const outLabelsPromise = axios
      .get(`/api/node/properties/out/${this.getArcDcid()}`)
      .then((resp) => resp.data);
    const inLabelsPromise = axios
      .get(`/api/node/properties/in/${this.getArcDcid()}`)
      .then((resp) => resp.data);
    Promise.all([outLabelsPromise, inLabelsPromise, provenancePromise])
      .then(([outLabels, inLabels, provenanceData]) => {
        const provDomain = {};
        for (const provId in provenanceData) {
          const url = provenanceData[provId];
          try {
            provDomain[provId] = new URL(url).host;
          } catch (err) {
            console.log("Invalid url in prov: " + url);
          }
        }
        this.setState({
          dataFetched: true,
          inLabels,
          outLabels,
          provDomain,
        });
      })
      .catch((e) => {
        console.log(e);
        this.setState({
          dataFetched: false,
        });
      });
  }
}

interface BrowserSectionTriggerPropType {
  title: string;
  opened: boolean;
}

export class BrowserSectionTrigger extends React.Component<BrowserSectionTriggerPropType> {
  render(): JSX.Element {
    return (
      <div className="browser-section-trigger">
        <h3 className="title">
          {this.props.opened ? (
            <i className="material-icons">remove</i>
          ) : (
            <i className="material-icons">add</i>
          )}
          {this.props.title}
        </h3>
      </div>
    );
  }
}
