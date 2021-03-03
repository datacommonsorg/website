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

const ignoredOutArcProperties = new Set([
  "provenance",
  "kmlCoordinates",
  "geoJsonCoordinates",
  "geoJsonCoordinatesDP1",
  "geoJsonCoordinatesDP2",
  "geoJsonCoordinatesDP3",
]);
const maxNameWithLanguageValues = 10;

interface OutArcsSectionPropType {
  dcid: string;
  outArcLabels: Array<string>;
  provDomain: { [key: string]: URL };
}

interface OutArcsSectionStateType {
  //TODO (chejennifer): replace the any type with an actual type
  arcValuesData: { [predicate: string]: Array<any> };
  propertyLabels: Array<string>;
}

export class OutArcsSection extends React.Component<
  OutArcsSectionPropType,
  OutArcsSectionStateType
> {
  constructor(props: OutArcsSectionPropType) {
    super(props);
    this.state = {
      arcValuesData: {},
      propertyLabels: [],
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  private fetchData(): void {
    const propValuesPromises = this.props.outArcLabels.map((label) => {
      if (!ignoredOutArcProperties.has(label)) {
        return axios
          .get(`/api/browser/propvals/${label}/${this.props.dcid}`)
          .then((resp) => resp.data);
      }
    });
    Promise.all(propValuesPromises).then((propValuesData) => {
      const outArcsByPredicate = {};
      const propertyLabels = [];
      propertyLabels.push("typeOf");
      propValuesData.forEach((valuesData) => {
        if (!valuesData) {
          return;
        }
        const predicate = valuesData.property;
        let values = valuesData.values.out;
        if (predicate == "nameWithLanguage") {
          const extra = values.length - maxNameWithLanguageValues;
          values = _.slice(values, 0, maxNameWithLanguageValues);
          values.push({
            value: "(... " + extra + " more ...)",
          });
        }
        outArcsByPredicate[predicate] = values;
        if (predicate != "typeOf") {
          propertyLabels.push(predicate);
        }
      });
      outArcsByPredicate["dcid"] = [{ value: this.props.dcid }];
      propertyLabels.push("dcid");
      this.setState({
        arcValuesData: outArcsByPredicate,
        propertyLabels: propertyLabels,
      });
    });
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.propertyLabels)) {
      return null;
    }
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
            {this.state.propertyLabels.map((propertyLabel) => {
              const valuesArray =
                propertyLabel in this.state.arcValuesData
                  ? this.state.arcValuesData[propertyLabel]
                  : [];
              return valuesArray.map((value, index) => {
                return (
                  <tr key={propertyLabel + index}>
                    <td className="property-column" width="25%">
                      <a href={"/browser2/" + propertyLabel}>{propertyLabel}</a>
                    </td>
                    <td width="50%">
                      {value.dcid ? (
                        <a href={"/browser2/" + value.dcid}>
                          {value.name ? value.name : value.dcid}
                        </a>
                      ) : (
                        <span className="out-arc-text">{value.value}</span>
                      )}
                    </td>
                    <td width="25%">
                      {value.provenanceId ? (
                        <a href={"/browser2/" + value.provenanceId}>
                          {this.props.provDomain[value.provenanceId]}
                        </a>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
