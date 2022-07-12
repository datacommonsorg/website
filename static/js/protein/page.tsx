/**
 * Copyright 2021 Google LLC
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

/**
 * Main component for bio.
 */

import axios from "axios";
import _ from "lodash";
import { array } from "prop-types";
import React from "react";
import { SourceMapDevToolPlugin } from "webpack";

import { GraphNodes } from "../shared/types";
import {
  drawChemGeneAssocChart,
  drawDiseaseGeneAssocChart,
  drawProteinInteractionChart,
  drawProteinInteractionGraph,
  drawTissueLegend,
  drawTissueScoreChart,
  drawVarGeneAssocChart,
  drawVarSigAssocChart,
  drawVarTypeAssocChart,
  GRAPH_BROWSER_REDIRECT,
  InteractionGraphData,
  InteractionGraphDataNested,
} from "./chart";
import {
  DCIDFromID,
  deduplicateInteractionDCIDs,
  getChemicalGeneAssoc,
  getDiseaseGeneAssoc,
  getInteractionTarget,
  getProteinDescription,
  getProteinInteraction,
  getProteinInteractionGraphData,
  getTissueScore,
  getVarGeneAssoc,
  getVarSigAssoc,
  getVarTypeAssoc,
  idFromDCID,
  MAX_INTERACTIONS,
  nodeFromID,
  getFromResponse,
  scoreDataFromResponse,
  scoreFromInteractionDCID,
  scoreFromProteinDCIDs,
  zip,
  responseGetters,
} from "./data_processing_utils";
export interface PagePropType {
  dcid: string;
  nodeName: string;
}

export interface PageStateType {
  data: GraphNodes;
  interactionDataDepth1?: any; // TODO: fix types
  interactionDataNested?: any;
  proteinInteractionDepth?: number;
}

export interface ProteinVarType {
  //genetic variant gene association dcid
  associationID: string;
  //reference id of the variant
  id: string;
  //name of the variant
  name: string;
  //log fold change value
  value: string;
  //log fold change interval
  interval: string;
}
// stores the disease ID, disease name and association score
export interface DiseaseAssociationType {
  id: string;
  name: string;
  value: number;
}

// stores the interacting protein name, confidence value, and parent protein name
export interface InteractingProteinType {
  name: string;
  value: number;
  parent: string;
}

const PPI_CONFIDENCE_SCORE_THRESHOLD = 0.4;
const PROTEIN_INTERACTION_DEPTH = 2;

export class Page extends React.Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.state = { data: null };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(): void {
    // this.fetchInteractionData(['bio/P53_HUMAN']);
    const tissueScore = getTissueScore(this.state.data);
    const diseaseGeneAssoc = getDiseaseGeneAssoc(this.state.data);
    const varGeneAssoc = getVarGeneAssoc(this.state.data);
    const varTypeAssoc = getVarTypeAssoc(this.state.data);
    const varSigAssoc = getVarSigAssoc(this.state.data);
    const chemGeneAssoc = getChemicalGeneAssoc(this.state.data);
    drawTissueScoreChart("tissue-score-chart", tissueScore);
    drawTissueLegend("tissue-score-legend", tissueScore);
    drawProteinInteractionChart(
      "protein-confidence-score-chart",
      this.state.interactionDataDepth1
    );
    drawProteinInteractionGraph(
      "protein-interaction-graph",
            {
              nodeData: this.state.interactionDataNested.nodeDataNested.slice(0, this.state.proteinInteractionDepth+1).flat(1),
              linkData: this.state.interactionDataNested.linkDataNested.slice(0, this.state.proteinInteractionDepth+1).flat(1)
            },
    );
    drawDiseaseGeneAssocChart(
      "disease-gene-association-chart",
      diseaseGeneAssoc
    );
    drawVarGeneAssocChart("variant-gene-association-chart", varGeneAssoc);
    drawVarTypeAssocChart("variant-type-association-chart", varTypeAssoc);
    drawVarSigAssocChart("variant-significance-association-chart", varSigAssoc);
    drawChemGeneAssocChart("chemical-gene-association-chart", chemGeneAssoc);
  }

  render(): JSX.Element {
    /* this.props.nodeName is formatted as ProteinName_SpeciesName
    Using the split we get the ProteinName and SpeciesName separately
    */
    const splitNodeName = this.props.nodeName.split("_");
    const proteinLink = `${GRAPH_BROWSER_REDIRECT}${this.props.dcid}`;
    const proteinDescription = getProteinDescription(this.state.data);
    return (
      <>
        <h2>{splitNodeName[0] + " (" + splitNodeName[1] + ")"}</h2>
        <h6>
          <a href={proteinLink}>Graph Browser View</a>
        </h6>
        <p>
          <b>Description: </b>
          {proteinDescription}
        </p>
        <h5>Protein Tissue Expression</h5>
        <p>
          {splitNodeName[0]} expression level (none, low, medium, or high)
          detected in each tissue as reported by The Human Protein Atlas. The
          color of the bar indicates the organ from which the tissue derives
          (legend bottom panel).
        </p>
        <div id="tissue-score-chart"></div>
        <div id="tissue-score-legend"></div>
        <h5>Protein Protein Interaction</h5>
        <p>
          The interaction score of {splitNodeName[0]} with other proteins as
          reported by The Molecular INTeraction Database (MINT). The top 10
          associations by interaction score are displayed.
        </p>
        <div id="protein-confidence-score-chart"></div>
        <div id="protein-interaction-graph"></div>
        <h5>Disease Gene Association</h5>
        <p>
          The association score of {splitNodeName[0]} with diseases as reported
          by DISEASES by Jensen Lab. Associations were determined by text mining
          of the literature. The top 10 associations by association score are
          displayed.
        </p>
        <div id="disease-gene-association-chart"></div>
        <h5>Variant Gene Association</h5>
        <p>
          Genetic variants that are associated with expression level of{" "}
          {splitNodeName[0]} in a specific tissue in humans (legend top right
          panel) as reported by the Genotype Expression (GTEx) project.
        </p>
        <div id="variant-gene-association-chart"></div>
        <h5>Variant Type Association</h5>
        <p>
          The count of genetic variants by functional category as reported by
          NCBI dbSNP, which are associated with regulation of {splitNodeName[0]}{" "}
          expression by the Genotype Expression (GTEx) project.
        </p>
        <div id="variant-type-association-chart"></div>
        <h5>Variant Gene Significance Association</h5>
        <p>
          The count of genetic variants by clinical significance as reported by
          NCBI ClinVar, which are associated with regulation of{" "}
          {splitNodeName[0]} expression by the Genotype Expression (GTEx)
          project.
        </p>
        <div id="variant-significance-association-chart"></div>
        <h5>Drug Gene Association</h5>
        <p>
          The number of drugs that are associated, ambiguously associated, or
          not associated with regulation of {splitNodeName[0]} as reported by
          pharmGKB.
        </p>
        <div id="chemical-gene-association-chart"></div>
      </>
    );
  }

  private fetchInteractionData(protein_dcids: string[]): any {
    const PPI_ENDPOINT =
      "https://autopush.api.datacommons.org/v1/bulk/property/in/interactingProtein/values";
    return axios.post(PPI_ENDPOINT, {
      entities: protein_dcids,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private fetchScoreData(interaction_dcids: string[]) {
    const SCORE_ENDPOINT =
      "https://autopush.api.datacommons.org/v1/bulk/property/out/confidenceScore/values";
    return axios.post(SCORE_ENDPOINT, {
      entities: interaction_dcids,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private expandProteinInteractionGraph(graphData: InteractionGraphDataNested){
      const nodesLastLayer = _.last(graphData.nodeDataNested);
      const nodeDCIDsLastLayer = nodesLastLayer.map(
        (nodeDatum) => DCIDFromID(nodeDatum.id)
      );
      const proteinDCIDSet = new Set(
        graphData.nodeDataNested.flat(1).map(node => DCIDFromID(node.id))
      );
      console.log(proteinDCIDSet);

      const expandPromise = this.fetchInteractionData(nodeDCIDsLastLayer).then((interactionResp) => {
        const interactionData = responseGetters.values(interactionResp).map(
          (interactions) => {
            return interactions.map(({ dcid }) => dcid);
          }
        );
        const interactionDataDedup = interactionData.map(
          deduplicateInteractionDCIDs
        );
        const interactionDCIDsDedup = interactionDataDedup.flat(1);

        const scorePromise = this.fetchScoreData(interactionDCIDsDedup).then((scoreResp) => {
          
          // Each interaction A_B will induce two keys A_B and B_A, both mapped to the confidence score of A_B.
          // This object serves two purposes:
          // 1) O(1) interaction score retrieval
          // 2) O(1) check for whether a given protein interacts with a depth 1 protein
          const scoresNewLayer = scoreDataFromResponse(scoreResp);

          const interactionDataSorted = zip(interactionDataDedup, nodesLastLayer).map(([dcidArray, parent]) =>
            dcidArray
              .filter((interactionDCID) => {
                const childDCID = getInteractionTarget(
                  idFromDCID(interactionDCID),
                  parent.id,
                  true
                );
                return (
                  !proteinDCIDSet.has(childDCID) &&
                  scoreFromInteractionDCID(scoresNewLayer, interactionDCID) >=
                    PPI_CONFIDENCE_SCORE_THRESHOLD
                );
              })
              .sort(
                (interactionDCID1, interactionDCID2) =>
                  scoreFromInteractionDCID(scoresNewLayer, interactionDCID1) -
                  scoreFromInteractionDCID(scoresNewLayer, interactionDCID2)
              )
          );

          // todo: add above to state for when user changes MAX_INTERACTIONS

          const interactionDataTruncated = interactionDataSorted.map(
            (dcidArray) => dcidArray.slice(0, MAX_INTERACTIONS)
          );

          const newLinks = zip(nodesLastLayer, interactionDataTruncated)
            .map(([source, interactions]) =>
              interactions.map((interactionDCID) => {
                const interactionID = idFromDCID(interactionDCID);
                return {
                  source: source.id,
                  target: getInteractionTarget(interactionID, source.id),
                  score: scoresNewLayer[interactionID],
                };
              })
            )
            .flat(1);

          const terminalLinks = [];

          nodeDCIDsLastLayer.forEach((nodeDCID1) => {
            Array.from(proteinDCIDSet).forEach((nodeDCID2) => { // TODO: change to all protein set
              const interactionScore = scoreFromProteinDCIDs(
                scoresNewLayer,
                nodeDCID1,
                nodeDCID2
              );

              // iterate through pairs {node1, node2}, where node1 !== node2.
              if (
                nodeDCID1.localeCompare(nodeDCID2) < 0 &&
                interactionScore >= PPI_CONFIDENCE_SCORE_THRESHOLD
              ) {
                terminalLinks.push({
                  source: idFromDCID(nodeDCID1),
                  target: idFromDCID(nodeDCID2),
                  score: interactionScore,
                });
              }
              return scorePromise;
            });
            return expandPromise;
          });

          const newNodeIDs = new Set(newLinks.map(({ target }) => target));

          const newNodes = Array.from(newNodeIDs).map((id) =>
            nodeFromID(id as string, graphData.nodeDataNested.length)
          ); // TODO: get rid of assertion here

          _.last(graphData.linkDataNested).push(...terminalLinks);
          graphData.nodeDataNested.push(newNodes);
          graphData.linkDataNested.push(newLinks);
        })
        return scorePromise;
      })
      return expandPromise;
  }

  private fetchData(): void {
    axios.get(`/api/protein/${this.props.dcid}`).then((resp) => {
      const interactionDataDepth1 = getProteinInteraction(
        resp.data,
        idFromDCID(this.props.dcid),
      );
      const graphData = getProteinInteractionGraphData(interactionDataDepth1);
      let expansions = Promise.resolve()
      for (let i = 0; i < PROTEIN_INTERACTION_DEPTH; i++){
        expansions = expansions.then( () => {
          this.expandProteinInteractionGraph(graphData);
        })
      }
      expansions.then(() => 
      {
         this.setState({
            data: resp.data,
            interactionDataDepth1: interactionDataDepth1,
            proteinInteractionDepth: PROTEIN_INTERACTION_DEPTH,
            interactionDataNested: graphData,
        })
      });
  })
}
}
