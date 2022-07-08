import _ from "lodash";

import { GraphNodes } from "../shared/types";
import {
  InteractionGraphData,
  InteractionLink,
  ProteinNode,
  ProteinStrData,
} from "./chart";
import { ProteinNumData } from "./chart";
import { ProteinVarType } from "./page";
import { InteractingProteinType } from "./page";

export const MAX_INTERACTIONS = 10; // upper bound on node degree in interaction graph viz's

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
export function nodeFromID(proteinSpeciesID: string, depth: number): ProteinNode {
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
): InteractionGraphData {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }

  // P53_HUMAN is central protein in below examples.
  // take interaction names of the form P53_HUMAN_ASPP2_HUMAN | ASPP2_HUMAN_P53_HUMAN and parse into ASPP2_HUMAN.
  const centerNodeID = data[0].parent;
  let nodeData = data.map(({ name, value }) => {
    // value is confidenceScore
    let neighbor = "";
    if (name.includes(`_${centerNodeID}`)) {
      // replace only first instance to handle self-interactions (P53_HUMAN_P53_HUMAN)
      neighbor = name.replace(`_${centerNodeID}`, "");
    } else if (name.includes(`${centerNodeID}_`)) {
      // same here
      neighbor = name.replace(`${centerNodeID}_`, "");
    }
    const nodeDatum = nodeFromID(neighbor, 1);
    nodeDatum["value"] = value;
    return nodeDatum;
  });

  // delete duplicates and self-interactions (will add support for self-interactions later on)
  const seen = new Set();
  nodeData = nodeData.filter((node) => {
    const duplicate = seen.has(node.name);
    seen.add(node.name);
    return !duplicate && node.id !== centerNodeID;
  });

  // descending order of interaction confidenceScore
  nodeData.sort((n1, n2) => n2.value - n1.value);
  // consider only top 10 interactions to avoid clutter
  nodeData = nodeData.slice(0, MAX_INTERACTIONS);

  const centerDatum = nodeFromID(centerNodeID, 0);
  nodeData.push(centerDatum);

  const linkData: InteractionLink[] = nodeData.map((node) => {
    return {
      score: node.value,
      source: centerNodeID,
      target: node.id,
    };
  });

  return {
    linkData,
    nodeData,
  };
}

export function getDiseaseGeneAssoc(data: GraphNodes): ProteinNumData[] {
  // Disease Gene Associations
  if (!data) {
    return [];
  }
  const returnData: ProteinNumData[] = [];
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
                if (n3.neighbors === undefined) {
                  continue;
                }
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
            returnData.push({ name: disease, value: score });
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
      let score = null;
      let variant = null;
      let tissue = null;
      let interval = null;
      for (const n of node.neighbors) {
        if (n.property !== "geneSymbol") {
          continue;
        }
        for (const n1 of n.nodes) {
          if (n1.neighbors.length !== 4) {
            continue;
          }
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
    console.log(proteinDescription);
    return proteinDescription;
  }
}

/**
 * Given array, key-maker function, and value-maker function, construct object from array. 
 * This is essentially a ts implementation of a python dictionary comprehension.
 * 
 * Reference: https://linuxtut.com/en/87ab3f313a75b547c278/
 * 
 * TODO: generic types
 */
export function arrayToObject(arr: any[], keyFunc: Function, valFunc: Function){
  return arr.reduce(( obj , elt) => Object.assign(obj, {[keyFunc(elt)]: valFunc(elt)}), {})
}

/**
 * Given (unpacked) array of arrays, return its transpose
 * This is a ts implementation of python's built-in zip function
 * 
 * Reference: https://gist.github.com/renaudtertrais/25fc5a2e64fe5d0e86894094c6989e10?permalink_comment_id=3783403#gistcomment-3783403
 */
// TODO: generic types
export function zip(...arrays: any[]){
  const minLen = Math.min(...arrays.map(arr => arr.length));
  const [firstArr, ...restArrs] = arrays;
  return firstArr.slice(0, minLen).map(
    (val, i) => [val, ...restArrs.map( arr => arr[i]) ]
  );
}

/**
 * TODO: docs
 */
export function responseToValues(resp){
  return resp.data.data.map(({values}) => values)
}

export function proteinsFromInteractionDCID(interaction_dcid): string[] {
  const id = interaction_dcid.replace("bio/", "");
  // danger: assumes neither {protein id}, {species id} contain an underscore
  const split = id.split("_");
  // TODO: write an assert function to handle this in general
  if (split.length !== 4) {
    throw `Unsupported DCID ${interaction_dcid}`;
  }
  return [`${split[0]}_${split[1]}`, `${split[2]}_${split[3]}`];
}

function formatInteractionDCID(interaction_dcid){
  const proteins = proteinsFromInteractionDCID(interaction_dcid)
  const proteins_sorted = proteins.sort( (p1, p2) => p1.localeCompare(p2));
  return `bio/${proteins_sorted.join('_')}`;
}

export function deduplicateInteractionDCIDs(interactionDCIDs: string[]): string[] {
  // Can't just use Set here because not guaranteed that A_B in list implies B_A in list
  // Counterexample: https://screenshot.googleplex.com/7JrfkVqt8crxVP9
  return Object.values(arrayToObject(interactionDCIDs, formatInteractionDCID, dcid => dcid)) as string[]
}

export function symmetrizeScores(interactionDCIDs, scores){
  const scoreObj = {};
  zip(interactionDCIDs, scores).forEach(([dcid, score]) => {
    const [protein1, protein2] = proteinsFromInteractionDCID(dcid);
    scoreObj[`${protein1}_${protein2}`] = score;
    scoreObj[`${protein2}_${protein1}`] = score;
  })
  return scoreObj
}

export function scoreFromProteins(scoreObj, proteinDCID1, proteinDCID2){
  const defaultScore = 0;
  const [protein1, protein2] = [proteinDCID1, proteinDCID2].map(dcid => dcid.replace('bio/', ""))
  return _.get(scoreObj, `${protein1}_${protein2}`, defaultScore);
}

export function scoreFromInteraction(scoreObj, interactionDCID){
  const defaultScore = 0;
  return _.get(scoreObj, interactionDCID.replace("bio/", ""), defaultScore);
}
