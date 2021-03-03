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

import React from "react";
import axios from "axios";
import _ from "lodash";

import { InArcsSection } from "./in_arcs";
import { OutArcsSection } from "./out_arcs";

interface ArcsSectionPropType {
  dcid: string;
  nodeName: string;
}

interface ArcsSectionStateType {
  inLabels: Array<string>;
  outLabels: Array<string>;
  provDomain: { [key: string]: URL };
}

export class ArcsSection extends React.Component<
  ArcsSectionPropType,
  ArcsSectionStateType
> {
  constructor(props: ArcsSectionPropType) {
    super(props);
    this.state = {
      inLabels: [],
      outLabels: [],
      provDomain: {},
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  private fetchData(): void {
    // TODO (chejennifer): observation nodes will need a different way of getting arc data
    const labelsPromise = axios
      .get(`/api/browser/proplabels/${this.props.dcid}`)
      .then((resp) => resp.data);
    const provenancePromise = axios
      .get(`/api/browser/triples/Provenance`)
      .then((resp) => resp.data);
    Promise.all([labelsPromise, provenancePromise]).then(
      ([labelsData, provenanceData]) => {
        const provDomain = {};
        for (const prov of provenanceData) {
          if (prov["predicate"] === "typeOf" && !!prov["subjectName"]) {
            provDomain[prov["subjectId"]] = new URL(prov["subjectName"]).host;
          }
        }
        this.setState({
          inLabels: labelsData["inLabels"],
          outLabels: labelsData["outLabels"],
          provDomain: provDomain,
        });
      }
    );
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.outLabels) && _.isEmpty(this.state.inLabels)) {
      return null;
    }
    return (
      <div>
        <OutArcsSection
          dcid={this.props.dcid}
          outArcLabels={this.state.outLabels}
          provDomain={this.state.provDomain}
        />
        <InArcsSection
          nodeName={this.props.nodeName}
          dcid={this.props.dcid}
          inArcLabels={this.state.inLabels}
          provDomain={this.state.provDomain}
        />
      </div>
    );
  }
}
