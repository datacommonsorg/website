/**
 * Copyright 2021 Google LLC
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
 * Main component for bio.
 */

import React from "react";
import axios from "axios";

import { GraphNode } from "../shared/types";

interface PagePropType {
  dcid: string;
  nodeName: string;
}

interface PageStateType {
  data: GraphNode;
}

export class Page extends React.Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.state = { data: null };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    const tissueScore = this.getTissueScore();
    // TODO: use d3 to draw bar chart here.
    return (
      <>
        <h2>{this.props.nodeName}</h2>
        {Object.keys(tissueScore).map((tissue) => {
          return (
            <div key={tissue}>
              <span>{tissue}</span>: <span>{tissueScore[tissue]}</span>
            </div>
          );
        })}
      </>
    );
  }

  private fetchData(): void {
    axios.get("/api/protein/" + this.props.dcid).then((resp) => {
      this.setState({
        data: resp.data,
      });
    });
  }

  private getTissueScore(): Record<string, string> {
    // Tissue to score mapping.
    if (!this.state.data) {
      return {};
    }
    const result = {};
    for (const neighbour of this.state.data.neighbours) {
      if (neighbour.property !== "detectedProtein") {
        continue;
      }
      for (const node of neighbour.nodes) {
        let tissue = null;
        let score = null;
        for (const n of node.neighbours) {
          if (n.property === "humanTissue") {
            tissue = n.nodes[0].value;
          } else if (n.property === "proteinExpressionScore") {
            score = n.nodes[0].value;
          }
        }
        result[tissue] = score;
      }
      return result;
    }
  }
}
