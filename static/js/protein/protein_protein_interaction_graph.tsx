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
import { FormGroup, Input, Label } from "reactstrap";

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
import { fetchInteractionsThenScores } from "./requests";
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
  interactions: number;
  scoreThreshold: number;
}

const CHART_ID = "protein-interaction-graph";
const DEPTH_INPUT_ID = "ppi-input-depth";

export const LIMITS = {
  MAX_DEPTH: 3,
  MIN_DEPTH: 0,
  MAX_INTERACTIONS: 4,
};

const DEFAULTS = {
  DEPTH: 2,
  INTERACTIONS: 4,
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
      interactions: DEFAULTS.INTERACTIONS,
      scoreThreshold: DEFAULTS.SCORE_THRESHOLD,
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
      const graphData = getProteinInteractionGraphData(
        this.props.interactionDataDepth1
      );
      // chain two BFS iterations
      const expansions = this.bfsIter(graphData)
        .then(() => this.bfsIter(graphData))
        .then(() => this.bfsIter(graphData));
      // updating state will then trigger the second call to this method
      expansions.then(() => {
        this.setState({
          graphData,
        });
      });
      return;
    }
    // this branch executes on second call to this method
    if (!_.isEmpty(this.state.graphData)) {
      drawProteinInteractionGraph(CHART_ID, {
        linkData: this.state.graphData.linkDataNested
          .slice(0, this.state.depth + 1)
          // TODO: add breadth-wise slicing by this.state.interactions
          .flat(1),
        nodeData: this.state.graphData.nodeDataNested
          .slice(0, this.state.depth + 1)
          .flat(1),
      });
    }
  }

  render(): JSX.Element {
    if (this.state.graphData === null) {
      return <div></div>;
    }
    return (
      <>
        <div id={CHART_ID}></div>
        <FormGroup>
          <Label for={DEPTH_INPUT_ID}>Depth</Label>
          <Input
            id={DEPTH_INPUT_ID}
            className={DEPTH_INPUT_ID}
            type="number"
            min={LIMITS.MIN_DEPTH}
            max={LIMITS.MAX_DEPTH}
            onChange={(e) => {
              this.setState({ depth: Number(e.target.value) });
            }}
            value={this.state.depth}
          />
        </FormGroup>
      </>
    );
  }

  /**
   * Given graph data, return promise to perform one iteration of BFS to add one layer to graph data.
   *
   * Note this is a bit peculiar in that new links discovered by BFS are split into two types:
   *  1) expansion links connect a last-layer node and a node not yet in the graph
   *  2) cross links connect a last-layer node and a node already in the graph
   *
   * This method has four stages:
   *  1) compute expansion links
   *  2) compute cross links
   *  3) compute new nodes from expansion links
   *  4) update graphData:
   *      - add cross links to the last layer in {graphData.linkDataNested}
   *      - add expansion links as a new layer of {graphData.linkDataNested}
   *      - add new nodes as a new layer of {graphData.nodeDataNested}
   *
   * Mutates: graphData
   * Notes:
   * - We choose not to setState here to avoid unnecessary rerendering when we
   * chain multiple calls to this method in BFS.
   */
  private bfsIter(graphData: MultiLevelInteractionGraphData): Promise<void> {
    const nodesLastLayer: ProteinNode[] = _.last(graphData.nodeDataNested);
    const nodeDCIDsLastLayer: bioDcid[] = nodesLastLayer.map((nodeDatum) =>
      ppiDcidFromId(nodeDatum.id)
    );

    const proteinDcidSet: Set<bioDcid> = new Set(
      graphData.nodeDataNested
        .flat(1)
        .map((node: ProteinNode) => ppiDcidFromId(node.id))
    );

    // set of links
    const linkSet = new Set<[string, string]>();
    graphData.linkDataNested.flat(1).forEach((linkDatum) => {
      linkSet.add([linkDatum.sourceId, linkDatum.targetId]);
      linkSet.add([linkDatum.targetId, linkDatum.sourceId]);
    });

    // expand graphData by 1 layer.
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
        const crossLinks: InteractionLink[] = [];

        // Stage 1: compute expansion links
        for (let i = 0; i < interactionData.length; i++) {
          const dcidArray = interactionData[i];
          const parent = nodesLastLayer[i];
          const filteredSorted = dcidArray
            // we filter for two conditions:
            // 1) child protein can't already be in the graph
            //    (we want to add ${this.state.maxInteractors} *new* children per parent, if they exist)
            // 2) parent-child interaction confidence score must be above ${this.state.scoreThreshold}
            .filter((interactionDcid) => {
              const interactionId = ppiIdFromDcid(interactionDcid);
              const childDcid = ppiDcidFromId(
                getInteractionTarget(interactionDcid, ppiDcidFromId(parent.id))
              );
              return (
                !proteinDcidSet.has(childDcid) &&
                _.get(
                  scoresNewLayer,
                  interactionId,
                  DEFAULTS.MISSING_SCORE_FILLER
                ) >= this.state.scoreThreshold
              );
            })
            // Sort in descending order of interaction confidence score.

            // There's a tradeoff here between initial load time and responsiveness to user-input.
            // Currently we filter before sorting, which makes the initial load cheaper,
            // But we would have to re-sort on new user-input.
            // Another option is to pay the one-time up-front cost of sorting the unfiltered interaction list and cache.
            .sort((interactionDcid1, interactionDcid2) => {
              const [score1, score2] = [interactionDcid1, interactionDcid2].map(
                (dcid) =>
                  _.get(
                    scoresNewLayer,
                    ppiIdFromDcid(dcid),
                    DEFAULTS.MISSING_SCORE_FILLER
                  )
              );
              return score1 - score2;
            })
            .slice(0, LIMITS.MAX_INTERACTIONS);

          // add an InteractionLink for each interaction
          filteredSorted.forEach((interactionDcid) => {
            const interactionID = ppiIdFromDcid(interactionDcid);
            const targetID = getInteractionTarget(
              interactionDcid,
              ppiDcidFromId(parent.id)
            );
            expansionLinks.push(
              getLink(parent.id, targetID, scoresNewLayer[interactionID])
            );
          });
        }

        // Stage 2: compute cross links
        // check if any of the proteins in the layer we just expanded interact with each other or previous proteins
        nodeDCIDsLastLayer.forEach((nodeDcid1) => {
          proteinDcidSet.forEach((nodeDcid2) => {
            const [nodeId1, nodeId2] = [nodeDcid1, nodeDcid2].map(
              ppiIdFromDcid
            );

            if (linkSet.has([nodeId1, nodeId2])) {
              return;
            }

            const interactionScore = _.get(
              scoresNewLayer,
              `${nodeId1}_${nodeId2}`,
              DEFAULTS.MISSING_SCORE_FILLER
            );
            if (interactionScore > this.state.scoreThreshold) {
              crossLinks.push(getLink(nodeId1, nodeId2, interactionScore));
            }
          });
        });

        // Stage 3: compute new nodes
        // deduplicate target IDs to get set of new node IDs
        const newNodeIDs = new Set(
          expansionLinks.map(({ targetId }) => targetId)
        );

        // TODO: nodes are currently colored by the group they're added with, but should be colored by min(parent.depth)
        // (if node is discovered after 2 iterations of BFS but the center protein is added as a parent during the cross link stage,
        //  node should be assigned depth 1)
        const newNodes = Array.from(newNodeIDs).map((id) =>
          nodeFromId(id, graphData.nodeDataNested.length)
        );

        // Stage 4: update graphData
        _.last(graphData.linkDataNested).push(...crossLinks);
        graphData.nodeDataNested.push(newNodes);
        graphData.linkDataNested.push(expansionLinks);
      }
    );

    return expandPromise;
  }
}
