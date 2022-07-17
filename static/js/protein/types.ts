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

import { AxiosResponse } from "axios";
import { SimulationLinkDatum, SimulationNodeDatum } from "d3";


export type bioDCID = `bio/${string}`

// interfaces for protein-protein interaction graph

export interface Node {
  id: string;
  name: string;
  value?: number;
}

// d3-force will add x,y,vx,vy data to ProteinNode after initialization
// https://github.com/tomwanzek/d3-v4-definitelytyped/blob/06ceb1a93584083475ecb4fc8b3144f34bac6d76/src/d3-force/index.d.ts#L13
export interface ProteinNode extends Node, SimulationNodeDatum {
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

// Base type of "values" value of objects stored in <V1 response>.data.data
export interface V1BaseDatum {
  dcid: string;
  name: string;
  provenanceId: string;
  types: string[];
}

export interface V1BioDatum extends V1BaseDatum {
    dcid: bioDCID;
}

// Generic for objects stored in <V1 response>.data.data
export type V1ResponseDatum<ValueDatum extends V1BaseDatum> = {
  entity: ValueDatum['dcid'];
  values: ValueDatum[];
};

// Generic for V1 response
// Reference: https://github.com/axios/axios/blob/7d6bddba2d8de29c263feaef4c40daa50cb4b176/index.d.ts#L83
export type V1Response<ValueDatum extends V1BaseDatum> = AxiosResponse<{
  data: V1ResponseDatum<ValueDatum>[];
}>;