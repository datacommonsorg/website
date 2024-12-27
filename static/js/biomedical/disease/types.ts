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

// types file containing different disease-specific interfaces

export interface DiseaseGeneAssociationData {
  // name of the associated gene
  name: string;
  // confidence score
  score: number;
  // lower confidence value = score - (interval/2)
  lowerInterval: number;
  // upper confidence value = score + (interval/2)
  upperInterval: number;
}

export interface DiseaseSymptomAssociationData {
  // name of the symptom
  name: string;
  // odds Ratio for association
  oddsRatio: number;
}

export interface DiseaseTreeNode {
  // name of current node in the tree
  name: string;
  // array of disease child name and corresponding children
  children: DiseaseTreeNode[];
}

export interface CompoundDiseaseTreatmentData {
  // node name and link
  node: string;
  // chemical compound id
  id: string;
  // chemical compound name
  name: string;
  // FDA clinical phase for which the compound has been studied
  clinicalPhaseNumber: number;
}

export interface CompoundDiseaseContraindicationData {
  // node name
  node: string;
  // chemical compound id
  id: string;
  // chemical compound name
  name: string;
  // drug central source name
  drugSource: string;
}

export interface ChemicalCompoundDataType {
  // node name
  node: string;
  // chemical compound id
  id: string;
  // chemical compound name
  name: string;
  // drug central source name
  drugSource: string;
  // FDA clinical phase for which the compound has been studied
  clinicalPhaseNumber: number;
  // chemical compound association type
  type: string;
}

export interface DrugTreatmentTableColumn {
  // the column id
  id: string;
  // the column display name or header
  name: string;
}
