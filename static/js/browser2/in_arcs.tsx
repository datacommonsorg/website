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
import { InArcsGroup } from "./in_arcs_group";

const IGNORED_PARENT_TYPES = new Set(["StatisticalPopulation"]);

interface InArcsSectionsPropType {
  nodeName: string;
  dcid: string;
  inArcLabels: Array<string>;
  provDomain: { [key: string]: URL };
}
interface InArcsSectionStateType {
  parentTypes: string[];
  arcsTableData: { [parentType: string]: { [property: string]: Array<any> } };
}

export class InArcsSection extends React.Component<
  InArcsSectionsPropType,
  InArcsSectionStateType
> {
  constructor(props: InArcsSectionsPropType) {
    super(props);
    this.state = {
      arcsTableData: {},
      parentTypes: [],
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  private fetchData(): void {
    const propValuesPromises = this.props.inArcLabels.map((label) => {
      return axios
        .get(`/api/browser/propvals/${label}/${this.props.dcid}`)
        .then((resp) => resp.data);
    });
    Promise.all(propValuesPromises).then((propValuesData) => {
      const inArcsByTypeAndPredicate = {};
      propValuesData.forEach((valuesData) => {
        if (!valuesData) {
          return;
        }
        const predicate = valuesData.property;
        const values = valuesData.values["in"];
        for (const value of values) {
          for (const type of value.types) {
            if (!(type in inArcsByTypeAndPredicate)) {
              inArcsByTypeAndPredicate[type] = {};
            }
            if (!(predicate in inArcsByTypeAndPredicate[type])) {
              inArcsByTypeAndPredicate[type][predicate] = [];
            }
            inArcsByTypeAndPredicate[type][predicate].push(value);
          }
        }
      });
      const parentTypes = Object.keys(inArcsByTypeAndPredicate).filter(
        (type) => !IGNORED_PARENT_TYPES.has(type)
      );
      parentTypes.sort();
      this.setState({
        arcsTableData: inArcsByTypeAndPredicate,
        parentTypes: parentTypes,
      });
    });
  }

  render(): JSX.Element {
    return (
      <div>
        {this.state.parentTypes.map((parentType) => {
          const arcsByPredicate = this.state.arcsTableData[parentType];
          return Object.keys(arcsByPredicate).map((predicate) => {
            return (
              <InArcsGroup
                nodeName={this.props.nodeName}
                parentType={parentType}
                property={predicate}
                arcValues={arcsByPredicate[predicate]}
                provDomain={this.props.provDomain}
                key={parentType + predicate}
              />
            );
          });
        })}
      </div>
    );
  }
}
