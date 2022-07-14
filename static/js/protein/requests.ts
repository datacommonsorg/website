import axios, { AxiosResponse } from "axios";
import { V1BaseDatum, V1Response } from "./data_processing_utils";

const V1_ENDPOINT_ROOT = "https://autopush.api.datacommons.org/v1"
// endpoints for protein-protein interaction graph
const PPI_ENDPOINTS = {
    INTERACTORS: `${V1_ENDPOINT_ROOT}/bulk/property/in/interactingProtein/values`,
    CONFIDENCE_SCORE: `${V1_ENDPOINT_ROOT}/bulk/property/out/confidenceScore/values`
}

/**
 * Given a V1 bulk endpoint and list of dcids, make a post request to the endpoint 
 */
function postV1Bulk(endpoint: string, dcids: string[]): Promise<V1Response<V1BaseDatum>>{
    return axios.post(endpoint, {
        entities: dcids,
        headers: {
            "Content-Type": "application/json"
        }
    })
}

export function fetchInteractionData(proteinDCIDs: string[]): ReturnType<typeof postV1Bulk> {
    return postV1Bulk(PPI_ENDPOINTS.INTERACTORS, proteinDCIDs)
}

export function fetchScoreData(interactionDCIDs: string[]): ReturnType<typeof postV1Bulk> {
    return postV1Bulk(PPI_ENDPOINTS.CONFIDENCE_SCORE, interactionDCIDs)
}