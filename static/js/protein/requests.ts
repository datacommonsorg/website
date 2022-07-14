import axios, { AxiosResponse } from "axios";

import {
  deduplicateInteractionDCIDs,
  V1BaseDatum,
  V1Response,
  valuesFromResponse,
} from "./data_processing_utils";

const V1_ENDPOINT_ROOT = "https://autopush.api.datacommons.org/v1";
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
): ReturnType<typeof postV1Bulk> {
  return postV1Bulk(PPI_ENDPOINTS.INTERACTORS, proteinDCIDs);
}

/**
 * Given list of interaction DCIDs, fetch their confidence scores
 */
export function fetchScoreData(
  interactionDCIDs: string[]
): ReturnType<typeof postV1Bulk> {
  return postV1Bulk(PPI_ENDPOINTS.CONFIDENCE_SCORE, interactionDCIDs);
}

/**
 * Given list of protein DCIDs, fetch their interactors and then the confidence scores of the interactions.
 * Return both the list of interactors and the score request.
 * 
 * Reference: https://2ality.com/2017/08/promise-callback-data-flow.html
 */
export function fetchInteractionsThenScores(
  proteinDCIDs: string[]
): Promise<[string[][], V1Response<V1BaseDatum>]> {
  return fetchInteractionData(proteinDCIDs).then((resp) => {
    const interactionData = valuesFromResponse(resp).map((interactions) => {
      return interactions.map(({ dcid }) => dcid);
    });
    return Promise.all([
      interactionData,
      fetchScoreData(interactionData.map(deduplicateInteractionDCIDs).flat(1)),
    ]);
  });
}
