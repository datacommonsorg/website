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
 * Component for displaying the out arcs.
 */

import React from "react";
import axios from "axios";
import _ from "lodash";
import { ArcTableRow } from "./arc_table_row";
import { ArcValue, removeLoadingMessage } from "./util";

const DCID_PREDICATE = "dcid";

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
  "censusACSTableId",
]);

interface OutArcSectionPropType {
  dcid: string;
  labels: string[];
  provDomain: { [key: string]: URL };
}

interface OutArcSectionStateType {
  data: OutArcData;
}

export class OutArcSection extends React.Component<
  OutArcSectionPropType,
  OutArcSectionStateType
> {
  constructor(props: OutArcSectionPropType) {
    super(props);
    this.state = {
      data: {},
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.data)) {
      return null;
    }
    const predicates = Object.keys(this.state.data);
    predicates.sort(this.predicateComparator);
    return (
      <div>
        <table className="node-table">
          <tbody>
            <tr key="header">
              <td className="property-column" width="25%">
                <strong>Property</strong>
              </td>
              <td width="50%">
                <strong>Value</strong>
              </td>
              <td width="25%">
                <strong>Provenance</strong>
              </td>
            </tr>
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
            <ArcTableRow
              key={DCID_PREDICATE}
              propertyLabel={DCID_PREDICATE}
              values={[{ text: this.props.dcid }]}
              provenanceId={""}
              src={null}
            />
          </tbody>
        </table>
      </div>
    );
  }

  private fetchData(): void {
    const propValuesPromises = this.props.labels.map((label) => {
      if (!IGNORED_OUT_ARC_PROPERTIES.has(label)) {
        return axios
          .get(`/api/browser/propvals/${label}/${this.props.dcid}`)
          .then((resp) => resp.data);
      }
    });
    Promise.all(propValuesPromises)
      .then((propValuesData) => {
        const outArcsByPredicateAndProvenance: OutArcData = {};
        propValuesData.forEach((valuesData) => {
          if (!valuesData || _.isEmpty(valuesData.values)) {
            return;
          }
          const predicate = valuesData.property;
          const values = valuesData.values.out;
          for (const value of values) {
            if (!(predicate in outArcsByPredicateAndProvenance)) {
              outArcsByPredicateAndProvenance[predicate] = {};
            }
            const provId = value.provenanceId;
            if (!(provId in outArcsByPredicateAndProvenance[predicate])) {
              outArcsByPredicateAndProvenance[predicate][provId] = [];
            }
            let valueText = "";
            if (value.dcid) {
              valueText = value.name ? value.name : value.dcid;
            } else {
              valueText = value.value;
            }
            outArcsByPredicateAndProvenance[predicate][provId].push({
              dcid: value.dcid,
              text: valueText,
            });
          }
        });
        removeLoadingMessage();
        this.setState({
          data: outArcsByPredicateAndProvenance,
        });
      })
      .catch(() => removeLoadingMessage());
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
