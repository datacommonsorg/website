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

import { GraphNodes } from "../shared/types";
import { ProteinStrData } from "./chart";
import { ProteinNumData } from "./chart";
import { ProteinVarType } from "./page";
import { InteractingProteinType } from "./page";
import { DiseaseAssociationType } from "./page";
import {
  bioDcid,
  InteractionLink,
  MultiLevelInteractionGraphData,
  ProteinNode,
  V1BioDatum,
  V1BioResponse,
  V1BioResponseDatum,
} from "./types";

// Upper bound on node degree in interaction graph viz's
export const MAX_INTERACTIONS = 4;
export const INTERACTION_QUANTITY_DCID = "IntactMiScore";

// Number to return if interaction score is missing
const DEFAULT_INTERACTION_SCORE = -1;

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

export function getTissueScore(data: GraphNodes): ProteinStrData[] {
  // Tissue to score mapping.
  if (!data) {
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
export function getProteinInteraction(
  data: GraphNodes,
  nodeName: string
): InteractingProteinType[] {
  // Protein Interaction to confidence score mapping.
  if (!data) {
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
      let protein_name = null;
      let confidence_score = null;
      let parent_protein = null;
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
          protein_name = n.nodes[0].value;
          parent_protein = nodeName;
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
                  confidence_score = num;
                }
              }
            }
          }
        }
      }
      // checking for duplicates
      if (!seen.has(protein_name)) {
        returnData.push({
          name: protein_name,
          value: confidence_score,
          parent: parent_protein,
        });
        seen.add(protein_name);
      }
    }
    return returnData;
  }
  return [];
}

export function getDiseaseGeneAssoc(
  data: GraphNodes
): DiseaseAssociationType[] {
  // Disease Gene Associations
  if (!data) {
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
      let disease = null;
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
                  if (n4.property !== "commonName") {
                    continue;
                  }
                  // check if the list is empty or not
                  if (_.isEmpty(n4.nodes) || _.isEmpty(n4.nodes[0].value)) {
                    continue;
                  }
                  disease = n4.nodes[0].value;
                }
              }
            } else if (n2.property === "associationConfidenceInterval") {
              if (_.isEmpty(n2.nodes)) {
                continue;
              }
              score = Number(n2.nodes[0].value);
            }
          }
          if (!seen.has(disease) && !!score) {
            returnData.push({ id: diseaseID, name: disease, value: score });
          }
          seen.add(disease);
        }
      }
    }
    return returnData;
  }
  return [];
}

export function getVarGeneAssoc(data: GraphNodes): ProteinVarType[] {
  // Variant Gene Associations
  if (!data) {
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
              associationID: associationID,
              id: variant,
              name: tissue,
              value: score,
              interval: interval,
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

export function getVarTypeAssoc(data: GraphNodes): ProteinNumData[] {
  // Variant Gene Associations
  if (!data) {
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

export function getVarSigAssoc(data: GraphNodes): ProteinNumData[] {
  // Variant Gene Associations
  if (!data) {
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

export function getChemicalGeneAssoc(data: GraphNodes): ProteinNumData[] {
  // Chem Gene Associations
  if (!data) {
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

    return result;
  }
  return [];
}

export function getProteinDescription(data: GraphNodes): string {
  let proteinDescription = null;
  if (!data) {
    return;
  }
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return;
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

/**
 * Convert DCID of form bio/<id> to id. Utility for protein-protein interaction (PPI) graph.
 */
export function ppiIdFromDcid(dcid: bioDcid): string {
  return dcid.replace("bio/", "");
}

/**
 * Given id, convert to DCID of form bio/<id>.  Utility for protein-protein interaction (PPI) graph.
 */
export function ppiDcidFromId(id: string): bioDcid {
  return `bio/${id}`;
}

/**
 * Given quantity DCID of the form "<quantityName><quantityValue>", attempt to extract and return quantityValue.
 * Return NaN if quantity DCID is malformatted.
 */
export function quantityFromDcid(
  quantityDcid: string,
  quantityName: string
): number {
  if (!quantityDcid.includes(quantityName)) {
    return NaN;
  }
  return Number(_.last(quantityDcid.split(quantityName)));
}

/**
 * Given interaction DCID of the form bio/{protein1}_{protein2} (e.g. bio/2A5D_YEAST_AHA1_YEAST),
 * return [protein1, protein2], or null if interaction DCID does not contain exactly 3 underscores.
 */
export function proteinsFromInteractionDcid(
  interactionDcid: bioDcid
): [string, string] {
  const id = ppiIdFromDcid(interactionDcid);
  // danger: assumes neither {protein name}, {species name} contain an underscore
  const split = id.split("_");
  if (split.length !== 4) {
    return null;
  }
  return [`${split[0]}_${split[1]}`, `${split[2]}_${split[3]}`];
}

/**
 * Given list L of interaction DCIDs, return new list such that for each subset of DCIDs in L
 * identifying the same pair of proteins (e.g. A_B and B_A), keep only one element of the subset.
 * Skip all malformatted interaction DCIDs.
 *
 * Does not mutate original list.
 */
export function deduplicateInteractionDcids(
  interactionDcids: bioDcid[]
): bioDcid[] {
  const uniqueInteractionDcids: bioDcid[] = [];
  const interactions = new Set<[string, string]>();
  interactionDcids.forEach((interactionDcid) => {
    const proteins = proteinsFromInteractionDcid(interactionDcid);
    if (proteins === null) {
      console.warn(`Invalid interaction ID ${interactionDcid} -- skipping`);
      return;
    }
    if (!interactions.has(proteins)) {
      uniqueInteractionDcids.push(interactionDcid);
      const [protein1, protein2] = proteins;
      interactions.add([protein1, protein2]);
      interactions.add([protein2, protein1]);
    }
  });
  return uniqueInteractionDcids;
}

/**
 * Given interaction DCID and source DCID, infer and return target ID.
 */
export function getInteractionTarget(
  interactionDcid: bioDcid,
  sourceDcid: bioDcid
): string {
  // note this also works in the case of a self-interaction
  const interactionId = ppiIdFromDcid(interactionDcid);
  const sourceId = ppiIdFromDcid(sourceDcid);
  const id = interactionId
    .replace(`${sourceId}_`, "")
    .replace(`_${sourceId}`, "");
  return id;
}

/**
 * Given protein id of the form {protein name}_{species name} (e.g. P53_HUMAN), parse into and return ProteinNode
 */
export function nodeFromId(proteinId: string, depth: number): ProteinNode {
  // assumes {species name} does not contain _
  // last checked: 06/22/22, when MINT was the provenance of all protein data
  const lastIndex = proteinId.lastIndexOf("_");
  return {
    depth,
    id: proteinId,
    name: proteinId.slice(0, lastIndex),
    species: proteinId.slice(lastIndex + 1),
  };
}

/**
 * Given interaction ID, source ID, and interaction score, return InteractionLink.
 * Note that we must store sourceID, targetID twice
 * because d3 will replace source, target with SimulationNodeDatum objects after initialization.
 */
export function getLink(
  sourceId: string,
  targetId: string,
  score: number
): InteractionLink {
  return {
    score,
    sourceId,
    targetId,
    source: sourceId,
    target: targetId,
  };
}

/**
 * Given interaction data as a list of InteractingProteinType, process into and return in the following format: 
 * 
      {

        nodeData : [
          { id: MECOM_HUMAN, name: "MECOM", species: "HUMAN", depth: 0 },
          { id: CTBP1_HUMAN, name: "CTBP1", species: "HUMAN", depth: 1 },
          { id: SUPT16H_HUMAN, name: "SUPT16H", species: "HUMAN", depth: 1 },
        ],

        linkData : [
          { source: MECOM_HUMAN, target: CTPB1_HUMAN, score: 0.3 },
          { source: MECOM_HUMAN, target: SUPT16H_HUMAN, score: 0.7 },
        ],

      }.
 */
export function getProteinInteractionGraphData(
  data: InteractingProteinType[]
): MultiLevelInteractionGraphData {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }

  // P53_HUMAN is central protein in below examples.
  // take interaction names of the form P53_HUMAN_ASPP2_HUMAN | ASPP2_HUMAN_P53_HUMAN and parse into ASPP2_HUMAN.
  const centerNodeId = data[0].parent;
  let neighbors = data.map(({ name: interactionId, value }) => {
    // value is confidenceScore
    const neighborId = getInteractionTarget(
      ppiDcidFromId(interactionId),
      ppiDcidFromId(centerNodeId)
    );
    const nodeDatum = nodeFromId(neighborId, 1);
    nodeDatum["value"] = value;
    return nodeDatum;
  });

  // delete duplicates and self-interactions (will add support for self-interactions later on)
  const seen = new Set();
  neighbors = neighbors.filter((node) => {
    const duplicate = seen.has(node.name);
    seen.add(node.name);
    return !duplicate && node.id !== centerNodeId;
  });

  // descending order of interaction confidenceScore
  neighbors.sort((n1, n2) => n2.value - n1.value);
  // consider only top 10 interactions to avoid clutter
  neighbors = neighbors.slice(0, MAX_INTERACTIONS);

  const centerDatum = nodeFromId(centerNodeId, 0);

  const linkData: InteractionLink[] = neighbors.map((node) => {
    return getLink(centerNodeId, node.id, node.value);
  });

  return {
    // guaranteed to be [] because we don't support self-interactions yet
    linkDataNested: [[], linkData],
    nodeDataNested: [[centerDatum], neighbors],
  };
}

/**
 * Given response and key, map each datum in response.data to datum[key] and return map.
 * If response.data is empty, return [].
 */
export function getFromResponse<K extends keyof V1BioResponseDatum>(
  resp: V1BioResponse,
  key: K
): V1BioResponseDatum[K][] {
  if (_.isEmpty(resp.data)) {
    return [];
  }
  return resp.data.map((datum) => datum[key]);
}

/**
 * Given an array of interaction DCIDs and a parallel array of corresponding scores,
 * construct and return score record such that for each interaction A_B with corresponding DCID in interaction DCIDs,
 * both A_B and B_A map to the score of A_B.  Skip all malformatted interaction DCIDs.
 *
 * Since we currently do not graphically distinguish between the A_B and B_A scores,
 * we choose to have a symmetric score store.
 *
 * In the future perhaps we should make the graph directed to make relationships like "A phosphorylates B"
 * more clear. I also think there should be assays for which the scores are not symmetric -
 * ex. "knockout A and see what happens to the expression of B". These might not exist in the graph currently
 * but could very well be imported in the future. Thus, we might have two or more edges between proteins
 * for each type of interaction they participate in, with different scores for each.
 */
export function symmetricScoreRec(
  interactionDcids: bioDcid[],
  scores: number[]
): Record<string, number> {
  const scoreRec = {};
  for (let i = 0; i < Math.min(interactionDcids.length, scores.length); i++) {
    const proteins = proteinsFromInteractionDcid(interactionDcids[i]);
    if (proteins === null) {
      console.warn(`Invalid interaction ID ${interactionDcids[i]} -- skipping`);
      continue;
    }
    const [proteinA, proteinB] = proteins;
    const scoreAB = _.get(
      scoreRec,
      `${proteinA}_${proteinB}`,
      DEFAULT_INTERACTION_SCORE
    );
    const scoreBA = _.get(
      scoreRec,
      `${proteinB}_${proteinA}`,
      DEFAULT_INTERACTION_SCORE
    );
    const maxScore = Math.max(scores[i], scoreAB, scoreBA);
    scoreRec[`${proteinA}_${proteinB}`] = maxScore;
    scoreRec[`${proteinB}_${proteinA}`] = maxScore;
  }
  return scoreRec;
}

/**
 * Given score response, construct a record mapping interaction IDs of the form A_B to their confidence scores,
 * satisfying the property that if A_B: A_B.score is in the record, then B_A: A_B.score is also.
 */
export function scoreDataFromResponse(
  scoreResponse: V1BioResponse
): Record<string, number> {
  const scoreValues = getFromResponse(scoreResponse, "values");
  const interactionDcids = getFromResponse(scoreResponse, "entity");
  if (scoreValues.length !== interactionDcids.length) {
    console.warn(
      "Number of scores and interactions computed from response differ. Edge widths in the graph may be incorrect."
    );
  }
  const scoreList = scoreValues
    // map scoreValues to IntactMiScore if available, otherwise map to default interaction score
    .map((bioData: V1BioDatum[], i) => {
      // skip loop if bioData is undefined
      for (const bioDatum of bioData || []) {
        if (_.get(bioDatum, "dcid", "").includes(INTERACTION_QUANTITY_DCID)) {
          const score = quantityFromDcid(
            bioDatum.dcid,
            INTERACTION_QUANTITY_DCID
          );
          if (!isNaN(score)) {
            return score;
          }
        }
      }
      if (i < interactionDcids.length) {
        console.warn(
          `Unable to retrieve score for interaction ${interactionDcids[i]} -- default score of ${DEFAULT_INTERACTION_SCORE} used`
        );
      }
      return DEFAULT_INTERACTION_SCORE;
    });
  return symmetricScoreRec(interactionDcids, scoreList);
}
