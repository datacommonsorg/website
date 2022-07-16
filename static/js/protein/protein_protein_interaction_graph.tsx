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
} from "./chart";
import {
  dcidFromID,
  deduplicateInteractionDCIDs,
  getInteractionTarget,
  getProteinInteractionGraphData,
  idFromDCID,
  MAX_INTERACTIONS,
  nodeFromID,
  getFromResponse,
  scoreDataFromResponse,
  scoreFromInteractionDCID,
  scoreFromProteinDCIDs,
  zip,
} from "./data_processing_utils";
import { InteractingProteinType } from "./page";
import { fetchInteractionData, fetchScoreData } from "./requests";

type InteractionGraphProps = {
    centerProteinDCID: string;
    interactionDataDepth1: InteractingProteinType[]
}

type InteractionGraphState = {
    graphData: InteractionGraphDataNested;
    depth: number;
    scoreThreshold: number;
    maxInteractions: number;
}

const DEFAULTS = {
    DEPTH: 2,
    MAX_INTERACTIONS: 4,
    SCORE_THRESHOLD: 0.4
}

export class ProteinProteinInteractionGraph extends React.Component<InteractionGraphProps, InteractionGraphState> {
  mounted: boolean;
  constructor(props: InteractionGraphProps) {
    super(props);
    this.mounted = true;
    console.log('props', _.cloneDeep(props))
    this.state = {
        graphData: getProteinInteractionGraphData(props.interactionDataDepth1),
        depth: DEFAULTS.DEPTH,
        scoreThreshold: DEFAULTS.MAX_INTERACTIONS,
        maxInteractions: DEFAULTS.SCORE_THRESHOLD,
    }
  }

  componentDidMount(): void {
    if (_.isEmpty(this.state.graphData)){
      return
    }
    const graphData = _.cloneDeep(this.state.graphData);
    const expansions = this.expandProteinInteractionGraph(graphData);
//   let expansions = Promise.resolve();
//   for (let i = 0; i < this.state.depth; i++){
//     expansions = this.expandProteinInteractionGraph(graphData).then(() => expansions)
//   }
    expansions.then(() => 
    {
        this.setState({
            graphData
    })
    });
  }

  componentDidUpdate(): void {
    if(_.isEmpty(this.state.graphData)){
      return;
    }
    drawProteinInteractionGraph(
      "protein-interaction-graph",
            {
              nodeData: this.state.graphData.nodeDataNested.slice(0, this.state.depth+1).flat(1),
              linkData: this.state.graphData.linkDataNested.slice(0, this.state.depth+1).flat(1)
            },
    );
  }

  componentWillUnmount(): void{
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
   * Notes: We choose not to setState here to avoid unnecessary rerendering when we
   * chain multiple calls to this method in BFS.
   */
  private expandProteinInteractionGraph(graphData: InteractionGraphDataNested) {
    console.log('graph', _.cloneDeep(graphData))
      const nodesLastLayer = _.last(graphData.nodeDataNested);
      const nodeDCIDsLastLayer = nodesLastLayer.map(
        (nodeDatum) => dcidFromID(nodeDatum.id)
      );
      const proteinDCIDSet = new Set(
        graphData.nodeDataNested.flat(1).map(node => dcidFromID(node.id))
      );

      const expandPromise = fetchInteractionData(nodeDCIDsLastLayer).then((interactionResp) => {
        const interactionData = getFromResponse(interactionResp, "values").map(
          (interactions) => {
            return interactions.map(({ dcid }) => dcid);
          }
        );
        const interactionDataDedup = interactionData.map(
          deduplicateInteractionDCIDs
        );
        const interactionDCIDsDedup = interactionDataDedup.flat(1);

        const scorePromise = fetchScoreData(interactionDCIDsDedup).then((scoreResp) => {
          
          // Each interaction A_B will induce two keys A_B and B_A, both mapped to the confidence score of A_B.
          // This object serves two purposes:
          // 1) O(1) interaction score retrieval
          // 2) O(1) check for whether a given protein interacts with a depth 1 protein
          const scoresNewLayer = scoreDataFromResponse(scoreResp);

          const interactionDataSorted = _.zip(interactionDataDedup, nodesLastLayer).map(([dcidArray, parent]) =>
            dcidArray
              .filter((interactionDCID) => {
                const childDCID = getInteractionTarget(
                  idFromDCID(interactionDCID),
                  parent.id,
                  true
                );
                return (
                  !proteinDCIDSet.has(childDCID) &&
                  scoreFromInteractionDCID(scoresNewLayer, interactionDCID) >=
                    this.state.scoreThreshold
                );
              })
              .sort(
                (interactionDCID1, interactionDCID2) =>
                  scoreFromInteractionDCID(scoresNewLayer, interactionDCID1) -
                  scoreFromInteractionDCID(scoresNewLayer, interactionDCID2)
              )
          );

          const interactionDataTruncated = interactionDataSorted.map(
            (dcidArray) => dcidArray.slice(0, this.state.maxInteractions)
          );

          const newLinks = _.zip(nodesLastLayer, interactionDataTruncated)
            .map(([source, interactions]) =>
              interactions.map((interactionDCID) => {
                const interactionID = idFromDCID(interactionDCID);
                return {
                  source: source.id,
                  target: getInteractionTarget(interactionID, source.id),
                  score: scoresNewLayer[interactionID],
                };
              })
            )
            .flat(1);

          const terminalLinks = [];

          nodeDCIDsLastLayer.forEach((nodeDCID1) => {
            Array.from(proteinDCIDSet).forEach((nodeDCID2) => {
              const interactionScore = scoreFromProteinDCIDs(
                scoresNewLayer,
                nodeDCID1,
                nodeDCID2
              );

              // iterate through pairs {node1, node2}, where node1 !== node2.
              if (
                nodeDCID1.localeCompare(nodeDCID2) < 0 &&
                interactionScore >= this.state.scoreThreshold
              ) {
                terminalLinks.push({
                  source: idFromDCID(nodeDCID1),
                  target: idFromDCID(nodeDCID2),
                  score: interactionScore,
                });
              }
              return scorePromise;
            });
            return expandPromise;
          });

          const newNodeIDs = new Set(newLinks.map(({ target }) => target));

          const newNodes = Array.from(newNodeIDs).map((id) =>
            nodeFromID(id as string, graphData.nodeDataNested.length)
          ); 

          _.last(graphData.linkDataNested).push(...terminalLinks);
          graphData.nodeDataNested.push(newNodes);
          graphData.linkDataNested.push(newLinks);
        })
        return scorePromise;
      })
      return expandPromise;
  }

}
