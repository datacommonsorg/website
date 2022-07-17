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
 * Protein-protein interaction graph
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import {
  drawProteinInteractionGraph,
  InteractionGraphData,
  InteractionGraphDataNested,
  InteractionLink,
} from "./chart";
import {
  dcidFromID,
  deduplicateInteractionDCIDs,
  getFromResponse,
  getInteractionTarget,
  getLink,
  getProteinInteractionGraphData,
  idFromDCID,
  MAX_INTERACTIONS,
  nodeFromID,
  scoreDataFromResponse,
  scoreFromInteractionDCID,
  scoreFromProteinDCIDs,
  zip,
} from "./data_processing_utils";
import { InteractingProteinType } from "./page";
import {
  fetchInteractionData,
  fetchInteractionsThenScores,
  fetchScoreData,
} from "./requests";

type InteractionGraphProps = {
  centerProteinDCID: string;
  interactionDataDepth1: InteractingProteinType[];
};

type InteractionGraphState = {
  graphData: InteractionGraphDataNested;
  depth: number;
  scoreThreshold: number;
  maxInteractions: number;
};

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
  mounted: boolean;
  constructor(props: InteractionGraphProps) {
    super(props);
    this.mounted = true;
    this.state = {
      graphData: getProteinInteractionGraphData(props.interactionDataDepth1),
      depth: DEFAULTS.DEPTH,
      scoreThreshold: DEFAULTS.SCORE_THRESHOLD,
      maxInteractions: DEFAULTS.MAX_INTERACTIONS,
    };
  }

  componentDidMount(): void {
    if (_.isEmpty(this.state.graphData)) {
      return;
    }
    const graphData = _.cloneDeep(this.state.graphData);
    const expansions = this.bfsIter(graphData).then(() =>
      this.bfsIter(graphData)
    );
    //   let expansions = Promise.resolve();
    //   for (let i = 0; i < this.state.depth; i++){
    //     expansions = this.expandProteinInteractionGraph(graphData).then(() => expansions)
    //   }
    expansions.then(() => {
      this.setState({
        graphData,
      });
    });
  }

  componentDidUpdate(): void {
    if (_.isEmpty(this.state.graphData)) {
      return;
    }
    drawProteinInteractionGraph("protein-interaction-graph", {
      nodeData: this.state.graphData.nodeDataNested
        .slice(0, this.state.depth + 1)
        .flat(1),
      linkData: this.state.graphData.linkDataNested
        .slice(0, this.state.depth + 1)
        .flat(1),
    });
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  render(): JSX.Element {
    return (
      <>
        <div id="protein-interaction-graph"></div>
      </>
    );
  }

  /**
   * Given graph data, performs one iteration of BFS to add one layer to graph data.
   *
   * Mutates: graphData
   * Notes:
   * - We choose not to setState here to avoid unnecessary rerendering when we
   * chain multiple calls to this method in BFS.
   */
  private bfsIter(graphData: InteractionGraphDataNested) {
    const nodesLastLayer = _.last(graphData.nodeDataNested);
    const nodeDCIDsLastLayer = nodesLastLayer.map((nodeDatum) =>
      dcidFromID(nodeDatum.id)
    );

    const proteinDCIDSet = new Set(
      graphData.nodeDataNested.flat(1).map((node) => dcidFromID(node.id))
    );

    const linkSet = new Set<string[]>();
    graphData.linkDataNested.flat(1).forEach((linkDatum) => {
      linkSet.add([linkDatum.sourceID, linkDatum.targetID]);
      linkSet.add([linkDatum.targetID, linkDatum.sourceID]);
    });

    const expandPromise = fetchInteractionsThenScores(nodeDCIDsLastLayer).then(
      ([interactionData, scoreResp]) => {
        // Each interaction A_B will induce two keys A_B and B_A, both mapped to the confidence score of A_B.
        // This object serves two purposes:
        // 1) O(1) interaction score retrieval
        // 2) O(1) check for whether a given protein interacts with a depth 1 protein
        const scoresNewLayer = scoreDataFromResponse(scoreResp);

        // To store links retrieved from response between last layer and new layer
        const expansionLinks: InteractionLink[] = [];
        // To store new links retrieved from response between last layer and itself and all previous layers
        const terminalLinks: InteractionLink[] = [];
        console.assert(interactionData.length == nodesLastLayer.length);
        for (let i = 0; i < interactionData.length; i++) {
          const dcidArray = interactionData[i];
          const parent = nodesLastLayer[i];
          const filteredSorted = dcidArray
            // we filter for two conditions:
            // 1) child protein can't already be in the graph
            //    (we want to add ${this.state.maxInteractors} *new* children per parent, if they exist)
            // 2) parent-child interaction confidence score must be above ${this.state.scoreThreshold}
            .filter((interactionDCID) => {
              const interactionID = idFromDCID(interactionDCID);
              const childDCID = getInteractionTarget(
                interactionID,
                parent.id,
                true
              );
              return (
                !proteinDCIDSet.has(childDCID) &&
                _.get(scoresNewLayer, interactionID, DEFAULTS.MISSING_SCORE_FILLER) >=
                  this.state.scoreThreshold
              );
            })
            // Sort in descending order of interaction confidence score.

            // There's a tradeoff here between initial load time and responsiveness to user-input.
            // Currently we filter before sorting, which makes the initial load cheaper,
            // But we would have to re-sort on new user-input.
            // Another option is to pay the one-time up-front cost of sorting the unfiltered interaction list and cache.
            .sort(
              (interactionDCID1, interactionDCID2) =>
              {
                const [score1, score2] = [interactionDCID1, interactionDCID2].map(dcid => _.get(scoresNewLayer, idFromDCID(dcid), DEFAULTS.MISSING_SCORE_FILLER));
                return score1 - score2;
              }
            )
            .slice(0, this.state.maxInteractions);

          // add an InteractionLink for each interaction
          filteredSorted.forEach((interactionDCID) => {
            const interactionID = idFromDCID(interactionDCID);
            const targetID = getInteractionTarget(interactionID, parent.id);
            expansionLinks.push(
              getLink(parent.id, targetID, scoresNewLayer[interactionID])
            );
          });
        }

        // check if any of the proteins in the layer we just expanded interact with each other or previous proteins
        nodeDCIDsLastLayer.forEach((nodeDCID1) => {
          proteinDCIDSet.forEach((nodeDCID2) => {
            const [nodeID1, nodeID2] = [nodeDCID1, nodeDCID2].map(idFromDCID);

            if (linkSet.has([nodeID1, nodeID2])) {
              return;
            }

            const interactionScore = _.get(scoresNewLayer, `${nodeID1}_${nodeID2}`, DEFAULTS.MISSING_SCORE_FILLER);
            if (interactionScore > this.state.scoreThreshold) {
              terminalLinks.push(getLink(nodeID1, nodeID2, interactionScore));
            }
          });
        });

        // deduplicate target IDs to get set of new node IDs
        const newNodeIDs = new Set(
          expansionLinks.map(({ targetID }) => targetID)
        );

        // TODO: nodes are currently colored by the group they're added with, but should be colored by min(parent.depth)
        // (if node is discovered after 2 iterations of BFS but the center protein is added as a parent during the terminal link stage,
        //  node should be assigned depth 1)
        const newNodes = Array.from(newNodeIDs).map((id) =>
          nodeFromID(id, graphData.nodeDataNested.length)
        );

        _.last(graphData.linkDataNested).push(...terminalLinks);
        graphData.nodeDataNested.push(newNodes);
        graphData.linkDataNested.push(expansionLinks);
      }
    );

    return expandPromise;
  }
}
