import _ from "lodash";

import { GraphNodes } from "../shared/types";
import { ProteinStrData } from "./chart";
import { ProteinNumData } from "./chart";

export interface ProteinVarType {
  id: string;
  name: string;
  value: string;
  interval: string;
}

export interface InteractingProteinType {
  name: string;
  value: number;
  parent: string;
}

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
        return [];
      }
      for (const n of node.neighbors) {
        if (n.property === "humanTissue") {
          // check for null tissue value and move to next iteration if true
          if (_.isEmpty(n.nodes[0].value)) {
            continue;
          }
          tissue = n.nodes[0].value;
        } else if (n.property === "proteinExpressionScore") {
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
          // check for null name values and move to next iteration if true
          if (_.isEmpty(n.nodes[0].value)) {
            continue;
          }
          protein_name = n.nodes[0].value;
          parent_protein = nodeName;
        } else if (n.property === "confidenceScore") {
          // not checking for empty values because if name exists, confidence score must exist
          for (const n1 of n.nodes) {
            for (const n2 of n1.neighbors) {
              if (n2.property === "value") {
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

export function getDiseaseGeneAssoc(data: GraphNodes): ProteinNumData[] {
  // Disease Gene Associations
  if (!data) {
    return [];
  }
  const returnData: ProteinNumData[] = [];
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
        return [];
      }
      for (const n of node.neighbors) {
        if (n.property === "geneID") {
          for (const n1 of n.nodes) {
            for (const n2 of n1.neighbors) {
              if (n2.property === "diseaseOntologyID") {
                for (const n3 of n2.nodes) {
                  if (n3.neighbors !== undefined) {
                    for (const n4 of n3.neighbors) {
                      if (n4.property === "commonName") {
                        if (_.isEmpty(n4.nodes[0].value)) {
                          continue;
                        }
                        disease = n4.nodes[0].value;
                      }
                    }
                  }
                }
              } else if (n2.property === "associationConfidenceInterval") {
                score = Number(n2.nodes[0].value);
              }
            }
            returnData.push({ name: disease, value: score });
          }
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
        if (n.property === "geneSymbol") {
          for (const n1 of n.nodes) {
            for (const n2 of n1.neighbors) {
              if (n2.property === "referenceSNPClusterID") {
                if (n2.nodes[0].value !== null) {
                  variant = n2.nodes[0].value;
                }
              } else if (n2.property === "log2AllelicFoldChange") {
                if (n2.nodes[0].value !== null) {
                  score = n2.nodes[0].value;
                }
              } else if (
                n2.property === "log2AllelicFoldChangeConfidenceInterval"
              ) {
                if (n2.nodes[0].value !== null) {
                  interval = n2.nodes[0].value;
                }
              } else if (n2.property === "associatedTissue") {
                if (n2.nodes[0].value) {
                  tissue = n2.nodes[0].value;
                }
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
  const result: ProteinNumData[] = [];
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

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
              //check for empty values
              if (_.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              const count = 1;
              variant = n2.nodes[0].value;
              result.push({ name: variant, value: count });
            }
          }
        }
      }
    }
    const returnData = [];
    // combine all the variant counts based on similar categories
    result.forEach(function (element) {
      if (!this[element.name]) {
        this[element.name] = { name: element.name, value: 0 };
        returnData.push(this[element.name]);
      }
      this[element.name].value += element.value;
    }, Object.create(null));
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
              if (_.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              let count = 0;
              variant = n2.nodes[0].value;
              count = 1;
              result.push({ name: variant, value: count });
            }
          }
        }
      }
    }
    const returnData = [];
    result.forEach(function (element) {
      if (!this[element.name]) {
        this[element.name] = { name: element.name, value: 0 };
        returnData.push(this[element.name]);
      }
      this[element.name].value += element.value;
    }, Object.create(null));
    return returnData;
  }
  return [];
}

export function getChemicalGeneAssoc(data: GraphNodes): ProteinNumData[] {
  // Chem Gene Associations
  if (!data) {
    return [];
  }
  const result: { name: string; value: number }[] = [];
  // check for null values
  if (_.isEmpty(data.nodes) || _.isEmpty(data.nodes[0].neighbors)) {
    return [];
  }

  for (const neighbour of data.nodes[0].neighbors) {
    if (neighbour.property !== "geneID") {
      continue;
    }
    if (_.isEmpty(neighbour.nodes)) {
      return [];
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
              // check for null values
              if (_.isEmpty(n2.nodes[0].value)) {
                continue;
              }
              let count = 0;
              association = n2.nodes[0].value;
              count = 1;
              result.push({ name: association, value: count });
            }
          }
        }
      }
    }
    const returnData = [];
    result.forEach(function (element) {
      if (!this[element.name]) {
        this[element.name] = { name: element.name, value: 0 };
        returnData.push(this[element.name]);
      }
      this[element.name].value += element.value;
    }, Object.create(null));

    // add zero count for relationships not found
    const addObject = [
      "RelationshipAssociationTypeAssociated",
      "RelationshipAssociationTypeNotAssociated",
      "RelationshipAssociationTypeAmbiguous",
    ];
    addObject.forEach((obj1) => {
      if (!returnData.find((obj2) => obj2.name === obj1))
        returnData.push({ name: obj1, value: 0 });
    });

    return returnData;
  }
  return [];
}
