import _ from "lodash";

import { GraphNodes } from "../shared/types";
import { DiseaseGeneAssociationRawData } from "./chart";
export function getDiseaseGeneAssociation(
  data: GraphNodes
): DiseaseGeneAssociationRawData[] {
  // Disease to gene associations
  // checks if the data is empty
  if (!data) {
    return [];
  }
  const returnData: DiseaseGeneAssociationRawData[] = [];
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
          if (_.isEmpty(n.nodes)) {
            continue;
          }
          score = n.nodes[0].value;
        } else if (n.property === "associationConfidenceInterval") {
          // check if the list is empty or not
          if (_.isEmpty(n.nodes)) {
            continue;
          }
          interval = n.nodes[0].value;
        }
      }
      returnData.push({ name: gene, score: score, interval: interval });
    }
    return returnData;
  }
  return [];
}
