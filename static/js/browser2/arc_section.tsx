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
 * Component for rendering the in and out arc sections of the page.
 */

import React from "react";
import axios from "axios";
import _ from "lodash";

import { InArcSection } from "./in_arc_section";
import { OutArcSection } from "./out_arc_section";

interface ArcSectionPropType {
  dcid: string;
  nodeName: string;
  displayInArcs: boolean;
}

interface ArcSectionStateType {
  inLabels: string[];
  outLabels: string[];
  provDomain: { [key: string]: URL };
  dataFetched: boolean;
}

export class ArcSection extends React.Component<
  ArcSectionPropType,
  ArcSectionStateType
> {
  constructor(props: ArcSectionPropType) {
    super(props);
    this.state = {
      inLabels: [],
      outLabels: [],
      provDomain: {},
      dataFetched: false,
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (!this.state.dataFetched) {
      return null;
    }
    return (
      <>
        <OutArcSection
          dcid={this.props.dcid}
          labels={this.state.outLabels}
          provDomain={this.state.provDomain}
        />
        {this.props.displayInArcs ? (
          <InArcSection
            nodeName={this.props.nodeName}
            dcid={this.props.dcid}
            labels={this.state.inLabels}
            provDomain={this.state.provDomain}
          />
        ) : null}
      </>
    );
  }

  private fetchData(): void {
    const labelsPromise = axios
      .get("/api/browser/proplabels/" + this.props.dcid)
      .then((resp) => resp.data);
    const provenancePromise = axios
      .get("/api/browser/triples/Provenance")
      .then((resp) => resp.data);
    Promise.all([labelsPromise, provenancePromise])
      .then(([labelsData, provenanceData]) => {
        const provDomain = {};
        for (const prov of provenanceData) {
          if (prov["predicate"] === "typeOf" && !!prov["subjectName"]) {
            provDomain[prov["subjectId"]] = new URL(prov["subjectName"]).host;
          }
        }
        this.setState({
          inLabels: labelsData["inLabels"],
          outLabels: labelsData["outLabels"],
          provDomain,
          dataFetched: true,
        });
      })
      .catch(() => {
        this.setState({
          dataFetched: true,
        });
      });
  }
}
