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

import axios from "axios";
import React from "react";

import { GraphNodes } from "../shared/types";
import { drawTissueScoreChart } from "./chart";

interface PagePropType {
  dcid: string;
  nodeName: string;
}

interface PageStateType {
  data: GraphNodes;
}

export class Page extends React.Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.state = { data: null };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(): void {
    const data: { name: string; value: string }[] = [];
    const tissueScore = this.getTissueScore();
    for (const tissue in tissueScore) {
      data.push({ name: tissue, value: tissueScore[tissue] });
    }
    drawTissueScoreChart("tissue-score-chart", data);
  }

  render(): JSX.Element {
    // TODO: use d3 to draw bar chart here.
    return (
      <>
        <h2>{this.props.nodeName}</h2>
        <div id="tissue-score-chart"></div>
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
    for (const neighbour of this.state.data.nodes[0].neighbors) {
      if (neighbour.property !== "detectedProtein") {
        continue;
      }
      for (const node of neighbour.nodes) {
        let tissue = null;
        let score = null;
        for (const n of node.neighbors) {
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
    return {};
  }
}
