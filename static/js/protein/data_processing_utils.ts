
import { GraphNodes } from "../shared/types";
import { ProteinPropDataStrType } from "./chart";
 
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

export function getTissueScore(data: GraphNodes): { name: string; value: string }[] {
    // Tissue to score mapping.
    if (!data) {
      return [];
    }
    const result = {};
    for (const neighbour of data.nodes[0].neighbors) {
      if (neighbour.property !== "detectedProtein") {
        continue;
      }
      for (const node of neighbour.nodes) {
        let tissue = null;
        let score = null;
        for (const n of node.neighbors) {
          if (n.property === "humanTissue") {
            tissue = n.nodes[0].value;
          } else if (n.property === "proteinExpressionScore") {
            score = n.nodes[0].value;
          }
        }
        result[tissue] = score;
      }
      const data: ProteinPropDataStrType[] = [];

      for (const tissue in result) {
        data.push({ name: tissue, value: result[tissue] });
      }
      return data;
    }
    return [];
  }
   export function getProteinInteraction(data: GraphNodes, nodeName: string): InteractingProteinType[] {
     // Protein Interaction to confidence score mapping.
     if (!data) {
       return [];
     }
     let objArray = [] as InteractingProteinType[];
     for (const neighbour of data.nodes[0].neighbors) {
       if (neighbour.property !== "interactingProtein") {
         continue;
       }
       for (const node of neighbour.nodes) {
         let protein_name = null;
         let confidence_score = null;
         let parent_protein = null;
         for (const n of node.neighbors) {
           if (n.property === "name") {
             protein_name = n.nodes[0].value;
             parent_protein = nodeName;
           } else if (n.property === "confidenceScore") {
             for (const n1 of n.nodes) {
               for(const n2 of n1.neighbors) {
                 if(n2.property === "value") {
                   let num = Number(n2.nodes[0].value);
                   if(num <= 1) {confidence_score = Number(n2.nodes[0].value);}
                 }
               }
                 
             }
           }
         }
          if (Array.isArray(objArray)) {
            objArray.push({name: protein_name, value: confidence_score, parent: parent_protein});
        } else {
          console.log('arr variable does not store an array');
        }
        const seen = new Set();
        objArray = objArray.filter(el => {
          const duplicate = seen.has(el.name);
          seen.add(el.name);
          return !duplicate;
        }); 
       }
       return objArray;
     }
     return [];
   }
 
   export function getDiseaseGeneAssoc(data: GraphNodes): { name: string; value: number }[] {
     // Disease Gene Associations
     if (!data) {
       return [];
     }
     const result = {};
     for (const neighbour of data.nodes[0].neighbors) {
       if (neighbour.property !== "geneID") {
         continue;
       }
       for (const node of neighbour.nodes) {
         let score = null;
         let disease = null;
           for (const n of node.neighbors) {
             if (n.property === "geneID") {
               for(const n1 of n.nodes) {
                 for(const n2 of n1.neighbors) {
                   if(n2.property === "diseaseOntologyID") {
                       for(const n3 of n2.nodes) {
                         if(n3.neighbors !== undefined) {
                           for(const n4 of n3.neighbors) {
                             if(n4.property === "commonName") {
                               disease = n4.nodes[0].value;
                             }
                           }
                         }
                         
                       }
                   } else if(n2.property === "associationConfidenceInterval") {
                     score = Number(n2.nodes[0].value);
                   }
                 }
                 result[disease] = score;
               }
             } 
           }
           
       }
       const data: { name: string; value: number }[] = [];
       for (const disease in result) {
         data.push({ name: disease, value: result[disease] });
       }
       return data;
     }
     return [];
   }
 
   export function getVarGeneAssoc(data: GraphNodes): ProteinVarType[] {
     // Variant Gene Associations
     if (!data) {
       return [];
     }
     let objArray = [] as ProteinVarType[];
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
               for(const n1 of n.nodes) {
                 for(const n2 of n1.neighbors) {
                   if(n2.property === "referenceSNPClusterID") {
                    if(n2.nodes[0].value !== null)
                      {variant = n2.nodes[0].value;}
                   } 
                   else if(n2.property === "log2AllelicFoldChange") {
                      if(n2.nodes[0].value !== null)
                        {score = n2.nodes[0].value;}
                   } 
                   else if(n2.property === "log2AllelicFoldChangeConfidenceInterval") {
                      if(n2.nodes[0].value !== null)
                        {interval = n2.nodes[0].value;}
                   } 
                   else if(n2.property === "associatedTissue") {
                    if(n2.nodes[0].value)
                      {tissue = n2.nodes[0].value;}
                   }
                 }
                  if (Array.isArray(objArray)) {
                      objArray.push({id: variant, name: tissue, value: score, interval: interval});
                  } else {
                    console.log('arr variable does not store an array');
                  }
                  Object.keys(objArray).forEach((key) => (objArray[key] == null) && delete objArray[key]);
                  const seen = new Set();
                  objArray = objArray.filter(el => {
                    const duplicate = seen.has(el.id);
                    seen.add(el.id);
                    return !duplicate;
                  });
                  objArray = objArray.filter(val => !!val.value)
               }
             } 
           }
           
       }
       return objArray;
     }
     return [];
   }
 
   export function getVarTypeAssoc(data: GraphNodes): { name: string; value: number }[] {
     // Variant Gene Associations
     if (!data) {
       return [];
     }
     const result: { name: string; value: number }[] = [];
     for (const neighbour of data.nodes[0].neighbors) {
       if (neighbour.property !== "geneID") {
         continue;
       }
       for (const node of neighbour.nodes) {
         let variant = null;
           for (const n of node.neighbors) {
             if (n.property === "geneID") {
               for(const n1 of n.nodes) {        
                 for(const n2 of n1.neighbors) {
                   if(n2.property === "geneticVariantFunctionalCategory") {
                    for (const n3 of n2.nodes) {
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
           
       }
       var dataNew = [];
       result.forEach(function (element) {
         if (!this[element.name]) {
             this[element.name] = { name: element.name, value: 0 };
             dataNew.push(this[element.name]);
         }
         this[element.name].value += element.value;
       }, Object.create(null));
       return dataNew;
     }
     return [];
   }
 
   export function getVarSigAssoc(data: GraphNodes): { name: string; value: number }[] {
     // Variant Gene Associations
     if (!data) {
       return [];
     }
     const result: { name: string; value: number }[] = [];
     for (const neighbour of data.nodes[0].neighbors) {
       if (neighbour.property !== "geneID") {
         continue;
       }
       for (const node of neighbour.nodes) {
         let variant = null;
           for (const n of node.neighbors) {
             if (n.property === "geneID") {
               for(const n1 of n.nodes) {        
                 for(const n2 of n1.neighbors) {
                   if(n2.property === "clinicalSignificance") {
                     let count = 0;            
                     variant = n2.nodes[0].value;
                     count = 1;
                     result.push({ name: variant, value: count });
                   } 
                 }
               }
             } 
           }
           
       }
       var dataNew = [];
       result.forEach(function (element) {
         if (!this[element.name]) {
             this[element.name] = { name: element.name, value: 0 };
             dataNew.push(this[element.name]);
         }
         this[element.name].value += element.value;
       }, Object.create(null));
       return dataNew;
     }
     return [];
   }
 
   export function getChemicalGeneAssoc(data: GraphNodes): { name: string; value: number }[] {
     // Chem Gene Associations
     if (!data) {
       return [];
     }
     const result: { name: string; value: number }[] = [];
     for (const neighbour of data.nodes[0].neighbors) {
       if (neighbour.property !== "geneID") {
         continue;
       }
       for (const node of neighbour.nodes) {
         let association = null;
           for (const n of node.neighbors) {
             if (n.property === "geneID") {
               for(const n1 of n.nodes) {
                 for(const n2 of n1.neighbors) {
                   if(n2.property === "relationshipAssociationType") {
                     let count = 0;
                     association = n2.nodes[0].value;
                     count = 1;
                     result.push({ name: association, value: count });}
 
                 }
               }
             } 
           }
           
       }
       var dataNew = [];
       result.forEach(function (element) {
         if (!this[element.name]) {
             this[element.name] = { name: element.name, value: 0 };
             dataNew.push(this[element.name]);
         }
         this[element.name].value += element.value;
       }, Object.create(null));
 
       var addObject = [{name: "RelationshipAssociationTypeAssociated", value: 0}, {name: "RelationshipAssociationTypeNotAssociated", value: 0}, {name: "RelationshipAssociationTypeAmbiguous", value: 0}];
       addObject.forEach( obj1 => {
         if(!dataNew.find( obj2 => obj2.name===obj1.name ))
          dataNew.push({name: obj1.name, value: obj1.value})
       })
 
       return dataNew;
     }
     return [];
   }
