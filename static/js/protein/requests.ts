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

import axios from "axios";

import {
  deduplicateInteractionDcids,
  getFromResponse,
} from "./data_processing_utils";
import { bioDcid, V1BioResponse } from "./types";

const V1_ENDPOINT_ROOT = "https://autopush.api.datacommons.org/v1";
// endpoints for protein-protein interaction graph
const PPI_ENDPOINTS = {
  CONFIDENCE_SCORE: `${V1_ENDPOINT_ROOT}/bulk/property/out/confidenceScore/values`,
  INTERACTORS: `${V1_ENDPOINT_ROOT}/bulk/property/in/interactingProtein/values`,
  TEST: "/api/protein/ppi/post/forward"
};

/**
 * Given list of protein DCIDs, fetch their interactors
 */
export function fetchInteractionData(
  proteinDCIDs: string[]
): Promise<V1BioResponse> {
  return axios.post(PPI_ENDPOINTS.TEST, {
    entities: proteinDCIDs,
    direction: 'in',
    property: 'interactingProtein'
  }).then(resp => resp.data)
}

/**
 * Given list of interaction DCIDs, fetch their confidence scores
 */
export function fetchScoreData(
  interactionDCIDs: bioDcid[]
): Promise<V1BioResponse> {
  return axios.post(PPI_ENDPOINTS.TEST, {
    entities: interactionDCIDs,
    direction: 'out',
    property: 'confidenceScore'
  }).then(resp => resp.data)
}

/**
 * Given list of protein DCIDs, fetch their interactors and then the confidence scores of the interactions.
 * Return promise for both the list of lists of interactors and the score response.
 */
export function fetchInteractionsThenScores(
  proteinDCIDs: bioDcid[]
): Promise<[bioDcid[][], V1BioResponse]> {
  return fetchInteractionData(proteinDCIDs).then((resp) => {
    // list of lists of interactors where the ith list contains the interactors of {proteinDCIDs[i]}
    // each list of interactors is deduplicated such that
    //  1) each element is unique
    //  2) if A_B appears in the list, then B_A does not appear
    const interactionData: bioDcid[][] = getFromResponse(resp, "values").map(
      (interactions) => {
        const dcids = interactions.map(({ dcid }) => dcid);
        return deduplicateInteractionDcids(dcids);
      }
    );

    return fetchScoreData(interactionData.flat(1)).then((resp) => [
      interactionData,
      resp,
    ]);
  });
}
