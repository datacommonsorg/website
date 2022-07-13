import _ from "lodash";

import { GraphNodes } from "../shared/types";
import {
  InteractionGraphData,
  InteractionGraphDataNested,
  InteractionLink,
  ProteinNode,
  ProteinStrData,
} from "./chart";
import { ProteinNumData } from "./chart";
import { ProteinVarType } from "./page";
import { InteractingProteinType } from "./page";
import { DiseaseAssociationType } from "./page";

// Base type of "values" value of objects stored in <V1 response>.data.data
type BaseDCDataType = {dcid: string, name: string, provenanceId: string, types: string[]};

// Generic for objects stored in <V1 response>.data.data
type V1ResponseDatum<DataType extends BaseDCDataType> = {
  entity: string;
  values: DataType[];
}

// Generic for V1 response
// TODO: consider extending AxiosResponse<unknown>
type V1Response<DataType extends BaseDCDataType> = {
  config: Object;
  data: {
    data?: V1ResponseDatum<DataType>[]
  }
  headers: Object;
  request?: Object;
  status: number;
  statusText: string;
}

// Upper bound on node degree in interaction graph viz's
export const MAX_INTERACTIONS = 4; 
export const INTERACTION_SCORE_NAME = "IntactMiScore"

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

/**
 * Given id of the form {protein id}_{species id} (e.g. P53_HUMAN), parse into and return ProteinNode
 */
export function nodeFromID(
  proteinSpeciesID: string,
  depth: number
): ProteinNode {
  // assumes {species id} does not contain _ (true as of 06/22/22)
  const lastIndex = proteinSpeciesID.lastIndexOf("_");
  return {
    depth,
    id: proteinSpeciesID,
    name: proteinSpeciesID.slice(0, lastIndex),
    species: proteinSpeciesID.slice(lastIndex + 1),
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
): InteractionGraphDataNested {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }

  // P53_HUMAN is central protein in below examples.
  // take interaction names of the form P53_HUMAN_ASPP2_HUMAN | ASPP2_HUMAN_P53_HUMAN and parse into ASPP2_HUMAN.
  const centerNodeID = data[0].parent;
  let neighbors = data.map(({ name: interactionID, value }) => {
    // value is confidenceScore
    const neighborID = getInteractionTarget(interactionID, DCIDFromID(centerNodeID))
    const nodeDatum = nodeFromID(neighborID, 1);
    nodeDatum["value"] = value;
    return nodeDatum;
  });

  // delete duplicates and self-interactions (will add support for self-interactions later on)
  const seen = new Set();
  neighbors = neighbors.filter((node) => {
    const duplicate = seen.has(node.name);
    seen.add(node.name);
    return !duplicate && node.id !== centerNodeID;
  });

  // descending order of interaction confidenceScore
  neighbors.sort((n1, n2) => n2.value - n1.value);
  // consider only top 10 interactions to avoid clutter
  neighbors = neighbors.slice(0, MAX_INTERACTIONS);

  const centerDatum = nodeFromID(centerNodeID, 0);

  const linkData: InteractionLink[] = neighbors.map((node) => {
    return {
      score: node.value,
      source: centerNodeID,
      target: node.id,
    };
  });

  return {
    linkDataNested: [[], linkData],
    nodeDataNested: [[centerDatum], neighbors]
  };
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
 * Given array, key-maker function, and value-maker function, construct object from array with string-valued keys.
 * This is essentially a ts implementation of a python dictionary comprehension.
 * 
 * Unfortunately generic index signature parameters aren't supported by TS yet, so we enforce that keys are strings.
 *
 * References: 
 *  - https://linuxtut.com/en/87ab3f313a75b547c278/
 *  - https://stackoverflow.com/questions/13315131/enforcing-the-type-of-the-indexed-members-of-a-typescript-object
 * 
 */
export function objectFromArray<T, V>(
  arr: T[],
  keyFunc: (arrElt: T) => string,
  valFunc: (arrElt: T) => V
): {[key: string] : V} {
  return arr.reduce(
    (obj, elt) => Object.assign(obj, { [keyFunc(elt)]: valFunc(elt) }),
    {}
  );
}

/**
 * Given an (unpacked) array of arrays, return its transpose (after trimming arrays to length of shortest one).
 * This is essentially a TS implementation of python's built-in zip function.
 * 
 * Adapted from implementation by Matt Mancini
 */
// Recursive type inference on array of arrays
type Zip<T> = T extends [Array<infer U>, ...infer Z] ? [U, ...Zip<Z>] : [];
export function zip<T extends unknown[][]>(...arrays: T): Array<Zip<T>> {
  const minLength = Math.min(...arrays.map(arr => arr.length))
  return Array.from(Array(minLength).keys()).map((_, i) => {
    return arrays.map(array => array[i]) as Zip<T>;
  });
}

/**
 * Convert DCID of form bio/<id> to id. 
 * Note: probably should be doing dcid: `bio/${string}`, but currently causes many type errors
 */
export function idFromDCID(dcid: string): string {
  return dcid.replace("bio/", "");
}

/**
 * Given id, convert to DCID of form bio/<id>
 */
export function DCIDFromID(id: string): string {
  return `bio/${id}`;
}

/**
 * Given interaction DCID of the form bio/{protein1}_{protein2}, return [protein1, protein2]
 */
export function proteinsFromInteractionDCID(interactionDCID: string): string[] {
  const id = idFromDCID(interactionDCID);
  // danger: assumes neither {protein id}, {species id} contain an underscore
  const split = id.split("_");
  if (split.length !== 4) {
    throw `Unsupported DCID ${interactionDCID}`;
  }
  return [`${split[0]}_${split[1]}`, `${split[2]}_${split[3]}`];
}

/**
 * Given interactionDCID of the form {protein 1}_{protein 2}, return ID of the same form
 * but with protein 1, protein 2 in alpha order. 
 */
function sortInteractionDCID(interactionDCID: string): string {
  const proteins = proteinsFromInteractionDCID(interactionDCID);
  // sort proteins alphabetically so A_B and B_A map to the same ID A_B
  const proteins_sorted = proteins.sort((p1, p2) => p1.localeCompare(p2));
  return DCIDFromID(proteins_sorted.join("_"));
}

/**
 * Given list of interaction DCIDs, for each subset of DCIDs identifying the same pair of proteins (e.g. A_B and B_A), keep only one.
 */
export function deduplicateInteractionDCIDs(
  interactionDCIDs: string[]
): string[] {
  // Can't just use Set here because not guaranteed that A_B in list implies B_A in list,
  // so we need to keep track of which order is the true DCID corresponding to an entity in the response.
  // Counterexample: https://screenshot.googleplex.com/7JrfkVqt8crxVP9
  return Object.values(
    objectFromArray(interactionDCIDs, sortInteractionDCID, (dcid) => dcid)
  ) as string[];
}

/**
 * Given interaction DCID and source DCID, infer and return target ID (or target DCID if returnDCID is true).
 */
export function getInteractionTarget(
  interactionDCID: string,
  sourceDCID: string,
  returnDCID = false
) {
  // note this also works in the case of a self-interaction
  const interactionID = idFromDCID(interactionDCID);
  const sourceID = idFromDCID(sourceDCID);
  const id = interactionID
    .replace(`${sourceID}_`, "")
    .replace(`_${sourceID}`, "");
  if (returnDCID) return DCIDFromID(id);
  return id;
}

/**
 * Given an array of interaction DCIDs and a parallel array of corresponding scores,
 * construct and return score object such that for each interaction A_B with corresponding DCID in interaction DCIDs, 
 * both A_B and B_A map to the score of A_B.  
 */
export function symmetrizeScores(interactionDCIDs: string[], scores: number[]): Record<string, number> {
  const scoreObj = {};
  zip(interactionDCIDs, scores).forEach(([dcid, score]) => {
    const [protein1, protein2] = proteinsFromInteractionDCID(dcid);
    scoreObj[`${protein1}_${protein2}`] = score;
    scoreObj[`${protein2}_${protein1}`] = score;
  });
  return scoreObj;
}

/**
 * Given an object mapping interaction IDs to confidence scores and the DCIDs of two proteins, return the score
 * of the interaction between the two proteins if it appears in the object, or the default score otherwise.
 */
export function scoreFromProteinDCIDs(scoreObj: Record<string, number>, proteinDCID1: string, proteinDCID2: string, defaultScore: number=DEFAULT_INTERACTION_SCORE): number {
  const [protein1, protein2] = [proteinDCID1, proteinDCID2].map((dcid) =>
  idFromDCID(dcid)
  );
  return _.get(scoreObj, `${protein1}_${protein2}`, defaultScore);
}

/**
 * Given an object mapping interaction IDs to confidence scores and the DCIDs of an interaction, return the score
 * of the interaction if it appears in the object, or the default score otherwise.
 */
export function scoreFromInteractionDCID(scoreObj: Record<string, number>, interactionDCID: string, defaultScore: number =DEFAULT_INTERACTION_SCORE) {
  return _.get(scoreObj, idFromDCID(interactionDCID), defaultScore);
}

/**
 * Given response and key, map each response datum to value of key and return map
 */
export function getFromResponse<T extends BaseDCDataType, K extends keyof V1ResponseDatum<T>>(resp: V1Response<T>, key: K){
  if (!("data" in resp.data)) return [];
  return resp.data.data.map(obj => obj[key]);
}

// Useful special cases of getFromResponse
// Notes that due to current limitations of TS indexed access types, "values" and "entity" need to be passed in twice - once as a type and once as a string
// Reference (last two paragraphs): https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html

/**
 * Given response, extract and return values (see def of V1Response) 
 */
export function valuesFromResponse<T extends BaseDCDataType>(resp: V1Response<T>): T[][]{
  return getFromResponse<T, "values">(resp, "values");
}

/**
 * Given response, extract and return DCIDs (entities) 
 */
export function dcidsFromResponse<T extends BaseDCDataType>(resp: V1Response<T>): string[]{
  return getFromResponse<T, "entity">(resp, "entity");
}

/**
 * Given quantity DCID of the form "<quantityName><quantityValue>", extract and return quantityValue.
 */
export function quantityFromDCID(quantityDCID: string, quantityName: string): number{
  if (!quantityDCID.includes(quantityName)){
    throw `DCID "${quantityDCID}" does not contain quantity name "${quantityName}"`;
  }
  return Number(_.last(quantityDCID.split(quantityName)))
}

/**
 * Given score response, construct an object mapping interaction IDs of the form A_B to their confidence scores, 
 * satisfying the property that if A_B: A_B.score is in the object, then B_A: A_B.score is also.
 */
export function scoreDataFromResponse(scoreResponse: V1Response<any>): Record<string, number>{
  const scoreValues = valuesFromResponse(scoreResponse);
  const interactionDCIDs = dcidsFromResponse(scoreResponse);
  const scoreList = scoreValues
    .map((scoreObjList: BaseDCDataType[] | undefined) => {
      if (scoreObjList !== undefined) {
      return scoreObjList
      .filter(({dcid}) => dcid.includes(INTERACTION_SCORE_NAME))}
      return [];
    }
      )
    .map((scoreObjList: BaseDCDataType[]) => {
      if (_.isEmpty(scoreObjList)) return DEFAULT_INTERACTION_SCORE;
      return quantityFromDCID(scoreObjList[0].dcid, INTERACTION_SCORE_NAME);
    })
  return symmetrizeScores(interactionDCIDs, scoreList);
}
