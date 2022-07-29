/**
 * Copyright 2022 Google LLC
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
 * Protein-protein interaction graph
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { drawProteinInteractionGraph } from "./chart";
import { bioDcid, MultiLevelInteractionGraphData } from "./types";

interface Props {
  centerProteinDcid: bioDcid;
}

interface State {
  depth: number;
  graphData: MultiLevelInteractionGraphData;
  numInteractions: number;
  scoreThreshold: number;
  drawn: boolean;
}

const CHART_ID = "protein-interaction-graph";

const DEFAULTS = {
  DEPTH: 2,
  MAX_INTERACTIONS: 4,
  MISSING_SCORE_FILLER: -1,
  SCORE_THRESHOLD: 0.4,
};

export class ProteinProteinInteractionGraph extends React.Component<
  Props,
  State
> {
  constructor(props: Props) {
    super(props);
    this.state = {
      depth: DEFAULTS.DEPTH,
      graphData: null,
      scoreThreshold: DEFAULTS.SCORE_THRESHOLD,
      numInteractions: DEFAULTS.MAX_INTERACTIONS,
      drawn: false,
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(prevProps: Props, prevState: State): void {
    if (_.isEmpty(this.state.graphData) || this.state.drawn){
      // wait for initial data fetch to finish
      return;
    }
    if (prevState.depth === this.state.depth && prevState.numInteractions === this.state.numInteractions && prevState.scoreThreshold === this.state.scoreThreshold){
      drawProteinInteractionGraph(CHART_ID, {
        linkData: this.state.graphData.linkDataNested.flat(1),
        nodeData: this.state.graphData.nodeDataNested.flat(1),
      });
      this.setState({drawn: true})
      return;
    }
    this.fetchData();
  }

  render(): JSX.Element {
    return <div id={CHART_ID}></div>;
  }

  private fetchData() {
    axios
      .post("/api/protein/ppi/bfs/", {
        proteinDcid: this.props.centerProteinDcid,
        depth: this.state.depth,
        scoreThreshold: this.state.scoreThreshold,
        maxInteractors: this.state.numInteractions,
      })
      .then((resp) => {
        this.setState({ graphData: resp.data , drawn: false});
      });
  }
}
