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

interface InteractionGraphProps {
  centerProteinDcid: bioDcid;
}

interface InteractionGraphState {
  depth: number;
  graphData: MultiLevelInteractionGraphData;
  numInteractions: number;
  scoreThreshold: number;
}

const CHART_ID = "protein-interaction-graph";

const DEFAULTS = {
  DEPTH: 2,
  MAX_INTERACTIONS: 4,
  MISSING_SCORE_FILLER: -1,
  SCORE_THRESHOLD: 0.4,
};

export class ProteinProteinInteractionGraph extends React.Component<
  InteractionGraphProps,
  InteractionGraphState
> {
  constructor(props: InteractionGraphProps) {
    super(props);
    this.state = {
      depth: DEFAULTS.DEPTH,
      graphData: null,
      scoreThreshold: DEFAULTS.SCORE_THRESHOLD,
      numInteractions: DEFAULTS.MAX_INTERACTIONS,
    };
  }

  /**
   * Perform BFS and (re)draw graph
   */
  componentDidUpdate(prevProps: InteractionGraphProps): void {
    // takes two calls to this method to draw the graph.
    //  1) first call retrieves graph data from flask endpoint
    //  2) second call draws the graph

    // this branch executes on first call to this method
    if (prevProps !== this.props) {
      axios
        .post("/api/protein/ppi/bfs/", {
          proteinDcid: this.props.centerProteinDcid,
          depth: this.state.depth,
          scoreThreshold: this.state.scoreThreshold,
          maxInteractors: this.state.numInteractions,
        })
        .then((resp) => {
          this.setState({ graphData: resp.data });
        });
      return;
    }
    // this branch executes on second call to this method
    if (!_.isEmpty(this.state.graphData)) {
      drawProteinInteractionGraph(CHART_ID, {
        linkData: this.state.graphData.linkDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
        nodeData: this.state.graphData.nodeDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
      });
    }
  }

  render(): JSX.Element {
    return <div id={CHART_ID}></div>;
  }
}
