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
  ChemicalCompoundDataType,
  CompoundDiseaseContraindicationData,
  CompoundDiseaseTreatmentData,
  DiseaseGeneAssociationData,
  DiseaseTreeNode,
  DiseaseParentTree,
  DiseaseSymptomAssociationData,
} from "./types";

/**
 * Fetches the disease-gene association data
 * @param data the data pertaining to the disease of interest
 * @returns an array of objects with gene name and its corresponding odds ratio, for the disease of interest
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
 * @returns an array of objects with symptom name and its corresponding association score, for the disease of interest
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
            if (_.isEmpty(n1.neighbors)) {
              continue;
            }
            for (const n2 of n1.neighbors) {
              if (n2.property !== "name") {
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

/**
 * Fetches the chemical compound data which includes disease treatment and disease contraindication data
 * @param data
 * @returns an array of chemical compounds with their associated properties
 */
export function getChemicalCompoundData(
  data: GraphNodes
): ChemicalCompoundDataType[] {
  if (
    _.isEmpty(data) ||
    _.isEmpty(data.nodes) ||
    _.isEmpty(data.nodes[0].neighbors)
  ) {
    return [];
  }
  const rawData: ChemicalCompoundDataType[] = [];
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "diseaseID") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let typeField = null;
      let nodeVal = null;
      let compoundID = null;
      let compoundName = null;
      let drugSourceName = null;
      let fdaPhase = null;

      // check for null or non-existent property values
      if (_.isEmpty(node.neighbors) || _.isEmpty(node.value)) {
        continue;
      }
      nodeVal = node.value;
      for (const n of node.neighbors) {
        if (n.property === "typeOf") {
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          typeField = n.nodes[0].value;
        } else if (n.property === "drugCentralSource") {
          // check for empty list and drug central source values
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          drugSourceName = n.nodes[0].value;
        } else if (n.property === "fdaClinicalTrialPhase") {
          // check for empty list and fda phase values
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          fdaPhase = n.nodes[0].value;
        } else if (n.property === "compoundID") {
          // check for empty list and compoundID values
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          compoundID = n.nodes[0].value;
          for (const n1 of n.nodes) {
            if (_.isEmpty(n1.neighbors)) {
              continue;
            }
            for (const n2 of n1.neighbors) {
              // check for empty list and common name values
              if (_.isEmpty(n2.nodes) || _.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              if (n2.property !== "commonName") {
                continue;
              }
              compoundName = n2.nodes[0].value;
            }
          }
        }
      }
      rawData.push({
        clinicalPhaseNumber: fdaPhase,
        drugSource: drugSourceName,
        id: compoundID.replace("bio/", ""),
        name: compoundName,
        node: nodeVal,
        type: typeField,
      });
    }
  }
  return rawData;
}

/**
 * Fetches the chemical compound disease treatment data
 * @param data
 * @returns an array of chemical compounds used for disease treatment and their other associated properties
 */
export function getCompoundDiseaseTreatment(
  data: GraphNodes
): CompoundDiseaseTreatmentData[] {
  const rawData = getChemicalCompoundData(data);
  const processedData = rawData
    .filter((element) => element.type === "ChemicalCompoundDiseaseTreatment")
    .map((element) => ({
      node: element.node,
      id: element.id,
      name: String(element.name).toLowerCase(),
      clinicalPhaseNumber: Number(element.clinicalPhaseNumber),
    }));
  processedData.sort((a, b) => b.clinicalPhaseNumber - a.clinicalPhaseNumber);
  return processedData;
}

/**
 * Fetches the chemical compound disease contraindication data
 * @param data
 * @returns an array of chemical compounds contraindicated for disease treatment and their other associated properties
 */
export function getCompoundDiseaseContraindication(
  data: GraphNodes
): CompoundDiseaseContraindicationData[] {
  // checks if the data is empty and for null values
  const rawData = getChemicalCompoundData(data);
  const processedData = rawData
    .filter(
      (element) => element.type === "ChemicalCompoundDiseaseContraindication"
    )
    .map((element) => ({
      node: element.node,
      id: element.id,
      name: String(element.name).toLowerCase(),
      drugSource: element.drugSource.toLowerCase(),
    }));
  processedData.sort((a, b) => (a.drugSource > b.drugSource ? 1 : -1));
  return processedData;
}

/**
 * Fetches the common name of the disease of interest
 * @param data
 * @returns string with disease common name
 */
export function getDiseaseCommonName(data: GraphNodes): string {
  let commonName = null;
  if (!data) {
    return "";
  }
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return "";
  }
  const diseaseDCID = data.nodes[0].value;
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "commonName") {
      continue;
    }
    // check for null or non-existent property values
    if (_.isEmpty(neighbour.nodes)) {
      continue;
    }
    commonName = neighbour.nodes[0].value;
    // check if string has atleast length 2, before performing string operations
    if (commonName.length < 2) {
      // return disease DCID instead of disease name
      return diseaseDCID;
    }
    // remove all double quotes from the string
    commonName = _.trim(commonName, '"');
    // capitalize the first letter of the disease name
    const formattedDiseaseName =
      commonName.charAt(0).toUpperCase() + commonName.slice(1);
    // return formatted disease name
    return formattedDiseaseName;
  }
}
/**
 * Checks whether the stat var for medical condition of disease exists
 * @param data
 * @returns boolean indicating if desired stat var exists
 */
export function doesDiseasePrevalenceIDexist(data: GraphNodes): boolean {
  // sets the default value of the boolean as false and checking for null values
  if (
    _.isEmpty(data) ||
    _.isEmpty(data.nodes) ||
    _.isEmpty(data.nodes[0].neighbors)
  ) {
    return false;
  }

  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "medicalCondition") {
      continue;
    }
    // check for null or non-existent property values
    if (_.isEmpty(neighbour.nodes)) {
      continue;
    }
    const medicalCondition = neighbour.nodes[0].value;
    if (!_.isEmpty(medicalCondition)) {
      return true;
    }
  }
  return false;
}
/**
 * Converts the disease parent data from a flat array to a tree array for tree visualization
 * @param data
 * @returns an array consisting of disease name and a sub-array of its children
 */
export function formatDiseaseParentTreeData(
  data: DiseaseTreeNode[]
): DiseaseParentTree {
  // sets the default value of the boolean as false and checking for null values
  let current = null;
  for (const node of data) {
    const child = current ? [current] : [];
    const nodeCurr = { name: node.name, children: child };
    current = nodeCurr;
  }
  return current;
}
