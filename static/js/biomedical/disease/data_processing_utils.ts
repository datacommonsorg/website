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
import _ from "lodash";

import { GraphNodes } from "../../shared/types";
import {
  DiseaseGeneAssociationData,
  DiseaseSymptomAssociationData,
} from "./chart";
/**
 * Fetches the disease-gene association data
 * @param data - the data pertaining to the disease of interest
 * @returns - an array of objects with gene name and its corresponding odds ratio, for the disease of interest
 */
export function getDiseaseGeneAssociation(
  data: GraphNodes
): DiseaseGeneAssociationData[] {
  // checks if the data is empty
  if (_.isEmpty(data)) {
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
      let gene = "";
      let score = null;
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
          score = Number(n.nodes[0].value);
        } else if (n.property === "associationConfidenceInterval") {
          // check if the list is empty or not
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          const interval = Number(n.nodes[0].value);
          lowerInterval = score - interval / 2;
          upperInterval = score + Number(interval / 2);
        }
      }
      if (score) {
        rawData.push({
          // remove the genome assembly prefix from gene name
          lowerInterval,
          name: gene.replace("bio/hg38_", ""),
          score,
          upperInterval,
        });
      }
    }
  }
  return rawData;
}
/**
 * Fetches the disease-symptom association data
 * @param data
 * @returns
 */
export function getDiseaseSymptomAssociation(
  data: GraphNodes
): DiseaseSymptomAssociationData[] {
  // checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const rawData: DiseaseSymptomAssociationData[] = [];
  // checks for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "diseaseOntologyID") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let symptom = null;
      let oddsRatioValue = null;
      // check for null or non-existent property values
      if (_.isEmpty(node.neighbors)) {
        continue;
      }
      for (const n of node.neighbors) {
        if (n.property === "associationOddsRatio") {
          // check for empty list and null gene values
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          oddsRatioValue = n.nodes[0].value;
        } else if (n.property === "medicalSubjectHeadingID") {
          for (const n1 of n.nodes) {
            if (n1.neighbors === undefined || _.isEmpty(n1.neighbors)) {
              continue;
            }
            for (const n2 of n1.neighbors) {
              if (n2.property !== "descriptorName") {
                continue;
              }
              // check if the list is empty or not
              if (_.isEmpty(n2.nodes) || _.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              symptom = n2.nodes[0].value;
            }
          }
        }
      }
      // skip over null values, and add the rest to the array
      if (!!symptom && !!oddsRatioValue) {
        rawData.push({
          name: symptom,
          oddsRatio: Number(oddsRatioValue),
        });
      }
    }
  }
  return rawData;
}
