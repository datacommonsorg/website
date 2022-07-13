import _ from "lodash";

import { GraphNodes } from "../shared/types";
import { DiseaseGeneAssociationData } from "./chart";
/**
 * Fetches the disease-gene association data
 * @param data
 * @returns
 */
export function getDiseaseGeneAssociation(
  data: GraphNodes
): DiseaseGeneAssociationData[] {
  // checks if the data is empty
  if (!data) {
    return [];
  }
  const rawData: DiseaseGeneAssociationData[] = [];
  // checks for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "diseaseOntologyID") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let gene = null;
      let score = null;
      let interval = null;
      let lowerInterval = null;
      let upperInterval = null;
      // check for null or non-existent property values
      if (_.isEmpty(node.neighbors)) {
        continue;
      }
      for (const n of node.neighbors) {
        if (n.property === "geneID") {
          // check for empty list and null gene values
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          gene = n.nodes[0].value;
        } else if (n.property === "associationScore") {
          // check if the list is empty or not
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          score = n.nodes[0].value;
        } else if (n.property === "associationConfidenceInterval") {
          // check if the list is empty or not
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          interval = n.nodes[0].value;
          lowerInterval = Number(score - interval / 2);
          upperInterval = Number(score) + Number(interval / 2);
        }
      }
      rawData.push({
        // remove the genome assembly prefix from gene name
        name: gene.replace("bio/hg38_", ""),
        score: score,
        lowerInterval: lowerInterval,
        upperInterval: upperInterval,
      });
    }

    return rawData;
  }
  return [];
}
