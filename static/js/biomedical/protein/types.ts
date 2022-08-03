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

import { SimulationLinkDatum, SimulationNodeDatum } from "d3";

export type BioDcid = `bio/${string}`;

// interfaces for protein-protein interaction graph

// d3-force will add x,y,vx,vy data to ProteinNode after initialization
// https://github.com/tomwanzek/d3-v4-definitelytyped/blob/06ceb1a93584083475ecb4fc8b3144f34bac6d76/src/d3-force/index.d.ts#L13
export interface ProteinNode extends SimulationNodeDatum {
  id: string;
  name: string;
  value?: number;
  depth: number;
  species: string;
}

// https://github.com/tomwanzek/d3-v4-definitelytyped/blob/06ceb1a93584083475ecb4fc8b3144f34bac6d76/src/d3-force/index.d.ts#L24
export interface InteractionLink extends SimulationLinkDatum<ProteinNode> {
  score: number;
}

// Represents interaction graph as a list of nodes and list of links
export interface InteractionGraphData {
  nodeData: ProteinNode[];
  linkData: InteractionLink[];
}

// Represents interaction graph depthwise as two parallel nested lists.  For each index i,
// nodeDataNested[i] will contain nodes distance i from the center node,
// and linkDataNested[i] will contain links involved in length-i walks from the center node,
// possibly also along with links between nodesDataNested[i] and existing nodes in the graph.
export interface MultiLevelInteractionGraphData {
  nodeDataNested: ProteinNode[][];
  linkDataNested: InteractionLink[][];
}
