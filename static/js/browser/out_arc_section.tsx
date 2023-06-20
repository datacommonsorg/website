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
 * Component for displaying the out arcs.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { PropertyValues } from "../shared/api_response_types";
import { loadSpinner, removeSpinner } from "../shared/util";
import { ArcTableRow } from "./arc_table_row";
import { ArcValue } from "./types";

const DCID_PREDICATE = "dcid";
const TYPEOF_PREDICATE = "typeOf";
const LOADING_CONTAINER_ID = "out-arc-loading";
const STAT_VAR_OBS_DCID = "StatVarObservation";
const STAT_VAR_OBS_PROVENANCE = "dc/5l5zxr1";

interface OutArcData {
  [predicate: string]: {
    [provenanceId: string]: Array<ArcValue>;
  };
}

const IGNORED_OUT_ARC_PROPERTIES = new Set([
  "provenance",
  "kmlCoordinates",
  "geoJsonCoordinates",
  "geoJsonCoordinatesDP1",
  "geoJsonCoordinatesDP2",
  "geoJsonCoordinatesDP3",
  "firePerimeter",
]);

interface OutArcSectionPropType {
  dcid: string;
  provDomain: { [key: string]: URL };
  nodeTypes: string[];
  showAllProperties: boolean;
}

interface OutArcSectionStateType {
  data: OutArcData;
  isDataFetched: boolean;
  errorMessage: string;
}

export class OutArcSection extends React.Component<
  OutArcSectionPropType,
  OutArcSectionStateType
> {
  constructor(props: OutArcSectionPropType) {
    super(props);
    this.state = {
      data: {},
      errorMessage: "",
      isDataFetched: false,
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (!this.state.isDataFetched) {
      return (
        <div id={LOADING_CONTAINER_ID} className="loading-spinner-container">
          <div id="browser-screen" className="screen">
            <div id="spinner"></div>
          </div>
        </div>
      );
    }
    if (!_.isEmpty(this.state.errorMessage)) {
      return <div className="error-message">{this.state.errorMessage}</div>;
    }
    if (_.isEmpty(this.state.data)) {
      return <div className="info-message">{this.notANodeMessage}</div>;
    }
    const data = this.state.data;
    if (this.props.nodeTypes.includes(STAT_VAR_OBS_DCID)) {
      data[TYPEOF_PREDICATE] = {
        [STAT_VAR_OBS_PROVENANCE]: [
          { text: STAT_VAR_OBS_DCID, dcid: STAT_VAR_OBS_DCID },
        ],
      };
    }
    const predicates = Object.keys(this.state.data);
    predicates.sort(this.predicateComparator);
    return (
      <div className={`card p-0 ${ASYNC_ELEMENT_CLASS}`}>
        <table className="node-table">
          <tbody>
            <tr key="header">
              <th className="property-column">Property</th>
              <th>Value</th>
              <th>Provenance</th>
            </tr>
            <ArcTableRow
              key={DCID_PREDICATE}
              propertyLabel={DCID_PREDICATE}
              values={[{ text: this.props.dcid }]}
              provenanceId={""}
              src={null}
            />
            {predicates.map((predicate) => {
              const valuesByProvenance = this.state.data[predicate];
              return Object.keys(valuesByProvenance).map(
                (provenanceId, index) => {
                  return (
                    <ArcTableRow
                      key={predicate + index}
                      propertyLabel={predicate}
                      values={valuesByProvenance[provenanceId]}
                      provenanceId={provenanceId}
                      src={
                        this.props.provDomain[provenanceId]
                          ? this.props.provDomain[provenanceId]
                          : null
                      }
                    />
                  );
                }
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  private notANodeMessage = `${this.props.dcid} is not a node.`;

  private fetchData(): void {
    loadSpinner(LOADING_CONTAINER_ID);
    axios
      .get(`/api/node/triples/out/${this.props.dcid}`)
      .then((resp) => {
        const triplesData: PropertyValues = resp.data;
        const outArcsByPredProv: OutArcData = {};
        for (const pred in triplesData) {
          if (IGNORED_OUT_ARC_PROPERTIES.has(pred)) {
            continue;
          }
          const predData = {};
          for (const node of triplesData[pred]) {
            const provId = node.provenanceId;
            if (!(provId in predData)) {
              predData[provId] = [];
            }
            let valueText = "";
            let valueDcid: string;
            if (node.dcid) {
              valueText = node.name ? node.name : node.dcid;
              valueDcid = node.dcid;
            } else {
              valueText = node.value;
            }
            predData[provId].push({
              dcid: valueDcid,
              text: valueText,
            });
          }
          outArcsByPredProv[pred] = predData;
        }
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          data: outArcsByPredProv,
          isDataFetched: true,
        });
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieving triples.",
          isDataFetched: true,
        });
      });
  }

  private predicateComparator = (a: string, b: string): number => {
    if (a === "typeOf") {
      return -1;
    }
    if (b === "typeOf") {
      return 1;
    }
    return a > b ? 1 : -1;
  };
}
