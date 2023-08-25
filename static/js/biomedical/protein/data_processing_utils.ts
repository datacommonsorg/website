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
import { ProteinNumData, ProteinStrData } from "./chart";
import {
  DiseaseAssociationType,
  InteractingProteinType,
  ProteinVarType,
} from "./page";

const VARIANT_CATEGORY = [
  "GeneticVariantFunctionalCategoryUTR3",
  "GeneticVariantFunctionalCategoryUTR5",
  "GeneticVariantFunctionalCategoryCodingSynon",
  "GeneticVariantFunctionalCategoryFrameshift",
  "GeneticVariantFunctionalCategoryIntron",
  "GeneticVariantFunctionalCategoryMissense",
  "GeneticVariantFunctionalCategoryNearGene3",
  "GeneticVariantFunctionalCategoryNearGene5",
  "GeneticVariantFunctionalCategoryNonsense",
  "GeneticVariantFunctionalCategorySplice3",
  "GeneticVariantFunctionalCategorySplice5",
  "GeneticVariantFunctionalCategoryStopLoss",
  "GeneticVariantFunctionalCategoryUnknown",
  "GeneticVariantFunctionalCDSIndel",
  "GeneticVariantFunctionalCategoryCDSReference",
  "GeneticVariantFunctionalCategoryncRNA",
];

const VARIANT_AFFECTS = [
  "ClinSigAffects",
  "ClinSigAssociation",
  "ClinSigAssociationNotFound",
  "ClinSigBenign",
  "ClinSigBenignLikelyBenign",
  "ClinSigConflictingPathogenicity",
  "ClinSigDrugResponse",
  "ClinSigHistocompatability",
  "ClinSigLikelyBenign",
  "ClinSigLikelyPathogenic",
  "ClinSigNotProvided",
  "ClinSigOther",
  "ClinSigPathogenic",
  "ClinSigPathogenicLikelyPathogenic",
  "ClinSigProtective",
  "ClinSigRiskFactor",
  "ClinSigUncertain",
  "ClinSigUnknown",
  "ClinSigUntested",
];

const CHEM_RELATIONS = [
  "RelationshipAssociationTypeAssociated",
  "RelationshipAssociationTypeNotAssociated",
  "RelationshipAssociationTypeAmbiguous",
];

/**
 * Fetches and formats the tissue name and expression score for the protein of interest
 * @param data
 * @returns array with tissue name and corresponding expression score
 */
export function getTissueScore(data: GraphNodes): ProteinStrData[] {
  // checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const returnData: ProteinStrData[] = [];
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "detectedProtein") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let tissue = null;
      let score = null;
      // check for null or non-existent property values
      if (_.isEmpty(node.neighbors)) {
        continue;
      }
      for (const n of node.neighbors) {
        if (n.property === "humanTissue") {
          // check for empty list and null tissue values
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          tissue = n.nodes[0].value;
        } else if (n.property === "proteinExpressionScore") {
          // check if the list is empty or not
          if (_.isEmpty(n.nodes)) {
            continue;
          }
          score = n.nodes[0].value;
        }
      }
      returnData.push({ name: tissue, value: score });
    }
    return returnData;
  }
  return [];
}

/**
 * Fetches and formats interacting protein names and interaction confidence scores for the protein of interest
 * @param data
 * @param nodeName
 * @returns array with interacting protein name, confidence score, parent protein name
 */
export function getProteinInteraction(
  data: GraphNodes,
  nodeName: string
): InteractingProteinType[] {
  // Checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const returnData = [] as InteractingProteinType[];
  const seen = new Set();
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "interactingProtein") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let proteinName = null;
      let confidenceScore = null;
      let parentProtein = null;
      // check for null or non-existent property values
      if (_.isEmpty(node.neighbors)) {
        continue;
      }
      for (const n of node.neighbors) {
        if (n.property === "name") {
          // check for empty list and null tissue values
          if (_.isEmpty(n.nodes) || _.isEmpty(n.nodes[0].value)) {
            continue;
          }
          proteinName = n.nodes[0].value;
          parentProtein = nodeName;
        } else if (n.property === "confidenceScore") {
          // not checking for empty values because if name exists, confidence score must exist
          for (const n1 of n.nodes) {
            for (const n2 of n1.neighbors) {
              if (n2.property === "value") {
                if (_.isEmpty(n2.nodes)) {
                  continue;
                }
                const num = Number(n2.nodes[0].value);
                if (num <= 1) {
                  confidenceScore = num;
                }
              }
            }
          }
        }
      }
      // checking for duplicates
      if (!seen.has(proteinName)) {
        returnData.push({
          name: proteinName,
          parent: parentProtein,
          value: confidenceScore,
        });
        seen.add(proteinName);
      }
    }
    return returnData;
  }
  return [];
}

/**
 * Fetches and formats disease names and their association scores for the protein of interest
 * @param data
 * @returns array with disease name and association score
 */
export function getDiseaseGeneAssoc(
  data: GraphNodes
): DiseaseAssociationType[] {
  // Checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const returnData: DiseaseAssociationType[] = [];
  const seen = new Set();
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "geneID") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let diseaseID = null;
      let score = null;
      let diseaseName = null;
      // check for null or non-existent property values
      if (_.isEmpty(node.neighbors)) {
        continue;
      }
      for (const n of node.neighbors) {
        if (n.property !== "geneID") {
          continue;
        }
        for (const n1 of n.nodes) {
          for (const n2 of n1.neighbors) {
            if (n2.property === "diseaseOntologyID") {
              for (const n3 of n2.nodes) {
                if (n3.neighbors === undefined || _.isEmpty(n3.value)) {
                  continue;
                }
                diseaseID = n3.value;
                for (const n4 of n3.neighbors) {
                  if (n4.property !== "name") {
                    continue;
                  }
                  // check if the list is empty or not
                  if (_.isEmpty(n4.nodes) || _.isEmpty(n4.nodes[0].value)) {
                    continue;
                  }
                  diseaseName = n4.nodes[0].value;
                }
              }
            } else if (n2.property === "associationConfidenceInterval") {
              if (_.isEmpty(n2.nodes)) {
                continue;
              }
              score = Number(n2.nodes[0].value);
            }
          }
          if (!seen.has(diseaseID) && !!score) {
            returnData.push({
              id: diseaseID,
              name: diseaseName || diseaseID,
              value: score,
            });
          }
          seen.add(diseaseID);
        }
      }
    }
    return returnData;
  }
  return [];
}

/**
 * Fetches and formats variant ids and their log 2 association scores for the protein of interest
 * @param data
 * @returns array with variant id and log 2 association score
 */
export function getVarGeneAssoc(data: GraphNodes): ProteinVarType[] {
  // Checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const returnData = [] as ProteinVarType[];
  const seen = new Set();
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "geneID") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let associationID = null;
      let score = null;
      let variant = null;
      let tissue = null;
      let interval = null;
      for (const n of node.neighbors) {
        if (n.property !== "geneSymbol") {
          continue;
        }
        for (const n1 of n.nodes) {
          if (n1.neighbors.length !== 4 || _.isEmpty(n1.value)) {
            continue;
          }
          associationID = n1.value;
          for (const n2 of n1.neighbors) {
            if (_.isEmpty(n2.nodes)) {
              continue;
            }
            if (n2.property === "log2AllelicFoldChange") {
              if (_.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              score = n2.nodes[0].value;
            } else if (n2.property === "referenceSNPClusterID") {
              if (_.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              variant = n2.nodes[0].value;
            } else if (
              n2.property === "log2AllelicFoldChangeConfidenceInterval"
            ) {
              if (_.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              interval = n2.nodes[0].value;
            } else if (n2.property === "associatedTissue") {
              if (_.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              tissue = n2.nodes[0].value;
            }
          }
          if (!seen.has(variant) && !!score) {
            returnData.push({
              associationID,
              id: variant,
              interval,
              name: tissue,
              value: score,
            });
          }
          seen.add(variant);
        }
      }
    }
    return returnData;
  }
  return [];
}

/**
 * Fetches and formats variant count and variant categories for the protein of interest
 * @param data
 * @returns array with variant count and corresponding variant functional category
 */
export function getVarTypeAssoc(data: GraphNodes): ProteinNumData[] {
  // Checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const returnData: ProteinNumData[] = [];
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

  const varResult = {};
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "geneID") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let variant = null;
      for (const n of node.neighbors) {
        if (n.property !== "geneID") {
          continue;
        }
        for (const n1 of n.nodes) {
          for (const n2 of n1.neighbors) {
            if (n2.property === "geneticVariantFunctionalCategory") {
              // check if the list is empty or not
              if (_.isEmpty(n2.nodes) || _.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              variant = n2.nodes[0].value;
              if (variant in varResult) {
                varResult[variant] = varResult[variant] + 1;
              } else {
                varResult[variant] = 1;
              }
            }
          }
        }
      }
    }
    for (const k of VARIANT_CATEGORY) {
      if (k in varResult) {
        continue;
      }
      varResult[k] = 0;
    }

    for (const m in varResult) {
      returnData.push({ name: m, value: varResult[m] });
    }
    return returnData;
  }
  return [];
}

/**
 * Fetches and formats variant count and clinical significance for the protein of interest
 * @param data
 * @returns array with variant count and corresponding variant clinical significance
 */
export function getVarSigAssoc(data: GraphNodes): ProteinNumData[] {
  // Checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const result: ProteinNumData[] = [];
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

  const varResult = {};
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "geneID") {
      continue;
    }
    for (const node of neighbour.nodes) {
      let variant = null;
      for (const n of node.neighbors) {
        if (n.property !== "geneID") {
          continue;
        }
        for (const n1 of n.nodes) {
          for (const n2 of n1.neighbors) {
            if (n2.property === "clinicalSignificance") {
              // check if the list is empty or not
              if (_.isEmpty(n2.nodes) || _.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              variant = n2.nodes[0].value;
              if (variant in varResult) {
                varResult[variant] = varResult[variant] + 1;
              } else {
                varResult[variant] = 1;
              }
            }
          }
        }
      }
    }
    for (const k of VARIANT_AFFECTS) {
      if (k in varResult) {
        continue;
      }
      varResult[k] = 0;
    }

    for (const m in varResult) {
      result.push({ name: m, value: varResult[m] });
    }
    return result;
  }
  return [];
}

/**
 * Fetches and formats drug association count and type from the protein of interest
 * @param data
 * @returns array with count and drug-gene association type
 */
export function getChemicalGeneAssoc(data: GraphNodes): ProteinNumData[] {
  // Checks if the data is empty
  if (_.isEmpty(data)) {
    return [];
  }
  const result: ProteinNumData[] = [];
  const chemAssoc = {};
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "geneID") {
      continue;
    }
    if (_.isEmpty(neighbour.nodes)) {
      continue;
    }
    for (const node of neighbour.nodes) {
      let association = null;
      for (const n of node.neighbors) {
        if (n.property !== "geneID") {
          continue;
        }
        for (const n1 of n.nodes) {
          for (const n2 of n1.neighbors) {
            if (n2.property === "relationshipAssociationType") {
              // check if the list is empty or not
              if (_.isEmpty(n2.nodes) || _.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              association = n2.nodes[0].value;
              if (association in chemAssoc) {
                chemAssoc[association] = chemAssoc[association] + 1;
              } else {
                chemAssoc[association] = 1;
              }
            }
          }
        }
      }
    }
    for (const k of CHEM_RELATIONS) {
      if (k in chemAssoc) {
        continue;
      }
      chemAssoc[k] = 0;
    }
    for (const m in chemAssoc) {
      result.push({ name: m, value: chemAssoc[m] });
    }
    const hasNonZero = result.findIndex((obj) => obj.value !== 0) >= 0;
    if (!hasNonZero) {
      return [];
    }
    return result;
  }
  return [];
}

/**
 * Fetches the description of the protein of interest
 * @param data
 * @returns string with protein description
 */
export function getProteinDescription(data: GraphNodes): string {
  let proteinDescription = null;
  if (!data) {
    return "";
  }
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return "";
  }
  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "description") {
      continue;
    }
    // check for null or non-existent property values
    if (_.isEmpty(neighbour.nodes)) {
      continue;
    }
    proteinDescription = neighbour.nodes[0].value;
    return proteinDescription;
  }
}
