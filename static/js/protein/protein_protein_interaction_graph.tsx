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

import { drawProteinInteractionGraph } from "./chart";
import { getProteinInteractionGraphData } from "./data_processing_utils";
import { InteractingProteinType } from "./page";
import { MultiLevelInteractionGraphData } from "./types";

interface InteractionGraphProps {
  centerProteinDcid: string;
  interactionDataDepth1: InteractingProteinType[];
};

interface InteractionGraphState {
  graphData: MultiLevelInteractionGraphData;
  depth: number;
  scoreThreshold: number;
  maxInteractions: number;
};

const CHART_ID = "protein-interaction-graph"

const DEFAULTS = {
  DEPTH: 2,
  MAX_INTERACTIONS: 4,
  SCORE_THRESHOLD: 0.4,
  MISSING_SCORE_FILLER: -1,
};

export class ProteinProteinInteractionGraph extends React.Component<
  InteractionGraphProps,
  InteractionGraphState
> {
  constructor(props: InteractionGraphProps) {
    super(props);
    this.state = {
      graphData: null,
      depth: DEFAULTS.DEPTH,
      scoreThreshold: DEFAULTS.SCORE_THRESHOLD,
      maxInteractions: DEFAULTS.MAX_INTERACTIONS,
    };
  }

  /**
   * Perform BFS and (re)draw graph
   */
  componentDidUpdate(prevProps: InteractionGraphProps): void {
    if (prevProps !== this.props) {
      const graphData = getProteinInteractionGraphData(
        this.props.interactionDataDepth1
      );
      this.setState({
        graphData,
      });
      return;
    }
    if (!_.isEmpty(this.state.graphData)) {
      drawProteinInteractionGraph(CHART_ID, {
        nodeData: this.state.graphData.nodeDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
        linkData: this.state.graphData.linkDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
      });
    }
  }

  render(): JSX.Element {
    return (
      <div id={CHART_ID}></div>
    );
  }
}
