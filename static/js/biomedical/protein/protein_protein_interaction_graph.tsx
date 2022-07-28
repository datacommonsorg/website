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

import _ from "lodash";
import React from "react";
import { resolveTypeReferenceDirective } from "typescript";

import { drawProteinInteractionGraph } from "./chart";
import {
  getInteractionTarget,
  getLink,
  getProteinInteractionGraphData,
  nodeFromId,
  ppiDcidFromId,
  ppiIdFromDcid,
  scoreDataFromResponse,
} from "./data_processing_utils";
import { InteractingProteinType } from "./page";
import { fetchGraph ,fetchInteractionsThenScores } from "./requests";
import {
  bioDcid,
  InteractionLink,
  MultiLevelInteractionGraphData,
  ProteinNode,
} from "./types";

interface InteractionGraphProps {
  centerProteinDcid: string;
  interactionDataDepth1: InteractingProteinType[];
}

interface InteractionGraphState {
  graphData: MultiLevelInteractionGraphData;
  depth: number;
  scoreThreshold: number;
  numInteractions: number;
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
  componentDidUpdate(prevProps: InteractionGraphProps | null): void {
    // takes two calls to this method to draw the graph.
    //  1) first call performs BFS and updates the graph
    //  2) second call draws the graph

    // this branch executes on first call to this method
    if (prevProps !== this.props) {
      fetchGraph(this.props.centerProteinDcid, this.state.depth, this.state.scoreThreshold, this.state.numInteractions).then( (resp) => {
        console.log(_.cloneDeep(resp.data))
        this.setState({graphData: resp.data})})
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
