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
 * Component for rendering all the groups of in arcs grouped by parentType and predicate.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { PropertyValues } from "../shared/api_response_types";
import { loadSpinner, removeSpinner } from "../shared/util";
import { InArcSubsection } from "./in_arc_subsection";
import { InArcValue } from "./types";

const IGNORED_PARENT_TYPES = new Set(["StatisticalPopulation"]);
const LOADING_CONTAINER_ID = "browser-in-arc-section";

interface InArcSectionsPropType {
  nodeName: string;
  dcid: string;
  provDomain: { [key: string]: URL };
}
interface InArcSectionStateType {
  data: { [parentType: string]: { [property: string]: Array<InArcValue> } };
  parentTypes: string[];
  errorMessage: string;
}

export class InArcSection extends React.Component<
  InArcSectionsPropType,
  InArcSectionStateType
> {
  constructor(props: InArcSectionsPropType) {
    super(props);
    this.state = {
      data: {},
      errorMessage: "",
      parentTypes: [],
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (!_.isEmpty(this.state.errorMessage)) {
      return <div className="error-message">{this.state.errorMessage}</div>;
    }
    return (
      <div id={LOADING_CONTAINER_ID} className="loading-spinner-container">
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
        <div id="browser-screen" className="screen">
          <div id="spinner"></div>
        </div>
      </div>
    );
  }

  private processTriplesResponse(
    triplesData: PropertyValues
  ): Record<string, Record<string, InArcValue[]>> {
    const inArcsByTypeAndPredicate = {};
    for (const pred in triplesData) {
      const values = triplesData[pred];
      for (const value of values) {
        if (_.isEmpty(value.types)) {
          continue;
        }
        for (const type of value.types) {
          if (!(type in inArcsByTypeAndPredicate)) {
            inArcsByTypeAndPredicate[type] = {};
          }
          if (!(pred in inArcsByTypeAndPredicate[type])) {
            inArcsByTypeAndPredicate[type][pred] = [];
          }
          inArcsByTypeAndPredicate[type][pred].push(value);
        }
      }
    }
    return inArcsByTypeAndPredicate;
  }

  private fetchData(): void {
    loadSpinner(LOADING_CONTAINER_ID);
    axios
      .get(`/api/node/triples/in/${this.props.dcid}`)
      .then((resp) => {
        const inArcsByTypeAndPredicate = this.processTriplesResponse(resp.data);
        const parentTypes = Object.keys(inArcsByTypeAndPredicate).filter(
          (type) => !IGNORED_PARENT_TYPES.has(type)
        );
        parentTypes.sort();
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          data: inArcsByTypeAndPredicate,
          parentTypes,
        });
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieving property values.",
        });
      });
  }
}
