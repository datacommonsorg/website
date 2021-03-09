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
 * Component for rendering all the groups of in arcs grouped by parentType and predicate.
 */

import React from "react";
import axios from "axios";
import { InArcSubsection } from "./in_arc_subsection";

const IGNORED_PARENT_TYPES = new Set(["StatisticalPopulation"]);

interface InArcSectionsPropType {
  nodeName: string;
  dcid: string;
  labels: string[];
  provDomain: { [key: string]: URL };
}
interface InArcSectionStateType {
  data: { [parentType: string]: { [property: string]: Array<any> } };
  parentTypes: string[];
}

export class InArcSection extends React.Component<
  InArcSectionsPropType,
  InArcSectionStateType
> {
  constructor(props: InArcSectionsPropType) {
    super(props);
    this.state = {
      data: {},
      parentTypes: [],
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    return (
      <div>
        {this.state.parentTypes.map((parentType) => {
          const arcsByPredicate = this.state.data[parentType];
          return Object.keys(arcsByPredicate).map((predicate) => {
            return (
              <InArcSubsection
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

  private removeLoadingMessage(): void {
    // TODO (chejennifer): better way to handle loading
    const loadingElem = document.getElementById("page-loading");
    if (loadingElem) {
      loadingElem.style.display = "none";
    }
  }

  private fetchData(): void {
    const propValuesPromises = this.props.labels.map((label) => {
      return axios
        .get(`/api/browser/propvals/${label}/${this.props.dcid}`)
        .then((resp) => resp.data);
    });
    Promise.all(propValuesPromises)
      .then((propValuesData) => {
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
        this.removeLoadingMessage();
        this.setState({
          data: inArcsByTypeAndPredicate,
          parentTypes,
        });
      })
      .catch(() => this.removeLoadingMessage());
  }
}
