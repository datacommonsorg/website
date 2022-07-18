import axios from "axios";

import {
  deduplicateInteractionDCIDs,
  V1BaseDatum,
  V1Response,
  valuesFromResponse,
} from "./data_processing_utils";

const V1_ENDPOINT_ROOT = "/api";
// endpoints for protein-protein interaction graph
const PPI_ENDPOINTS = {
  INTERACTORS: `${V1_ENDPOINT_ROOT}/bulk/property/in/interactingProtein/values`,
  CONFIDENCE_SCORE: `${V1_ENDPOINT_ROOT}/bulk/property/out/confidenceScore/values`,
};

/**
 * Given a V1 bulk endpoint and list of dcids, make a post request to the endpoint
 */
function postV1Bulk(
  endpoint: string,
  dcids: string[]
): Promise<V1Response<V1BaseDatum>> {
  return axios.post(endpoint, {
    entities: dcids,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Given list of protein DCIDs, fetch their interactors
 */
export function fetchInteractionData(
  proteinDCIDs: string[]
): Promise<V1Response<V1BaseDatum>> {
  return axios.post(PPI_ENDPOINTS.INTERACTORS, {
    entities: proteinDCIDs,
  });
}

/**
 * Given list of interaction DCIDs, fetch their confidence scores
 */
export function fetchScoreData(
  interactionDCIDs: string[]
): Promise<V1Response<V1BaseDatum>> {
  return axios.post(PPI_ENDPOINTS.CONFIDENCE_SCORE, {
    entities: interactionDCIDs,
  });
}

/**
 * Given list of protein DCIDs, fetch their interactors and then the confidence scores of the interactions.
 * Return promise for both the list of lists of interactors and the score response.
 */
export function fetchInteractionsThenScores(
  proteinDCIDs: string[]
): Promise<[string[][], V1Response<V1BaseDatum>]> {
  return fetchInteractionData(proteinDCIDs).then((resp) => {
    // list of lists of interactors where the ith list contains the interactors of {proteinDCIDs[i]}
    // each list of interactors is deduplicated such that
    //  1) each element is unique
    //  2) if A_B appears in the list, then B_A does not appear
    const interactionData: string[][] = valuesFromResponse(resp).map((interactions) => {
      return interactions.map(({ dcid }) => dcid);
    }).map(deduplicateInteractionDCIDs);

    return fetchScoreData(interactionData.flat(1)).then(resp => [interactionData, resp])
  });
}
