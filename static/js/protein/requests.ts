import axios from "axios";
import { deduplicateInteractionDCIDs, getFromResponse } from "./data_processing_utils";
import { V1Response, V1BaseDatum, bioDCID, V1BioDatum } from "./types";

const V1_ENDPOINT_ROOT = "https://autopush.api.datacommons.org/v1";
// endpoints for protein-protein interaction graph
const PPI_ENDPOINTS = {
  INTERACTORS: `${V1_ENDPOINT_ROOT}/bulk/property/in/interactingProtein/values`,
  CONFIDENCE_SCORE: `${V1_ENDPOINT_ROOT}/bulk/property/out/confidenceScore/values`,
};

/**
 * Given list of protein DCIDs, fetch their interactors
 */
export function fetchInteractionData(
  proteinDCIDs: string[]
): Promise<V1Response<V1BaseDatum>> {
  return axios.post(PPI_ENDPOINTS.INTERACTORS, {
    entities: proteinDCIDs,
    headers:{
      'Content-Type': "application/json"
    }
  });
}

/**
 * Given list of interaction DCIDs, fetch their confidence scores
 */
export function fetchScoreData(
  interactionDCIDs: bioDCID[]
): Promise<V1Response<V1BioDatum>> {
  return axios.post(PPI_ENDPOINTS.CONFIDENCE_SCORE, {
    entities: interactionDCIDs,
    headers:{
      'Content-Type': "application/json"
    }
  });
}

/**
 * Given list of protein DCIDs, fetch their interactors and then the confidence scores of the interactions.
 * Return promise for both the list of lists of interactors and the score response.
 */
export function fetchInteractionsThenScores(
  proteinDCIDs: bioDCID[]
): Promise<[bioDCID[][], V1Response<V1BioDatum>]> {
  return fetchInteractionData(proteinDCIDs).then((resp) => {
    // list of lists of interactors where the ith list contains the interactors of {proteinDCIDs[i]}
    // each list of interactors is deduplicated such that
    //  1) each element is unique
    //  2) if A_B appears in the list, then B_A does not appear
    const interactionData: bioDCID[][] = getFromResponse(resp, "values").map((interactions) => {
      return interactions.map(({ dcid }) => dcid);
    }).map(deduplicateInteractionDCIDs);

    return fetchScoreData(interactionData.flat(1)).then(resp => [interactionData, resp])
  });
}
