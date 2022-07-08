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
} from "./chart";
import {
  arrayToObject,
  deduplicateInteractionDCIDs,
  getChemicalGeneAssoc,
  getDiseaseGeneAssoc,
  getProteinDescription,
  getProteinInteraction,
  getProteinInteractionGraphData,
  getTissueScore,
  getVarGeneAssoc,
  getVarSigAssoc,
  getVarTypeAssoc,
  MAX_INTERACTIONS,
  nodeFromID,
  proteinsFromInteractionDCID,
  responseToValues,
  scoreFromInteraction,
  symmetrizeScores,
  zip,
} from "./data_processing_utils";

interface PagePropType {
  dcid: string;
  nodeName: string;
}

interface PageStateType {
  data: GraphNodes;
  interactionData?: any // TODO: fix types
  interactionDataDepth1?: any
}

// stores the variant id, tissue name, log fold change value, and log fold change confidence interval
export interface ProteinVarType {
  id: string;
  name: string;
  value: string;
  interval: string;
}

// stores the interacting protein name, confidence value, and parent protein name
export interface InteractingProteinType {
  name: string;
  value: number;
  parent: string;
}

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
    drawProteinInteractionGraph("protein-interaction-graph", this.state.interactionData);
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
    const proteinDescription = getProteinDescription(this.state.data);
    return (
      <>
        <h2>{splitNodeName[0] + " (" + splitNodeName[1] + ")"}</h2>
        <p>
          <b>Description: </b>
          {proteinDescription}
        </p>
        <h5>Protein Tissue Association</h5>
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

        // this.setState({interactionDataDepth1: getProteinInteraction(
        //   this.state.data,
        //   this.props.nodeName
        // )});

    private fetchInteractionData(protein_dcids: string[]): any{
      const PPI_ENDPOINT = 'https://autopush.api.datacommons.org/v1/bulk/property/in/interactingProtein/values';
      return axios.post(PPI_ENDPOINT, 
        {
          entities: protein_dcids,
          // entities: ['bio/P53_HUMAN', 'bio/FGFR1_HUMAN'],
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    private fetchScoreData(interaction_dcids: string[]) {
      const SCORE_ENDPOINT = 'https://autopush.api.datacommons.org/v1/bulk/property/out/confidenceScore/values';
      return axios.post(SCORE_ENDPOINT, 
        {
          entities: interaction_dcids,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

  private fetchData(): void {
    const PPI_CONFIDENCE_SCORE_THRESHOLD = 0.4
    axios.get("/api/protein/" + this.props.dcid).then((resp) => {
      const proteinSet = new Set([this.props.dcid]);
      console.log('proteinset', proteinSet)
      const interactionDataDepth1 = getProteinInteraction(resp.data, this.props.nodeName);
      console.log(interactionDataDepth1)
      const graphData = getProteinInteractionGraphData(interactionDataDepth1);
      console.log('graph', graphData)
      // breadth 1 dcids
      const nodeDCIDs = graphData.nodeData.map(nodeDatum => `bio/${nodeDatum.id}`); // TODO: 'bio' should be a global const
      nodeDCIDs.forEach(proteinSet.add, proteinSet);
      this.fetchInteractionData(nodeDCIDs).then(
        (interactionResp) => {
          console.log(interactionResp)

          const interactionData = responseToValues(interactionResp)
                                  .map(interactions => interactions
                                                      .map(({dcid}) => dcid))
          console.log('int data', interactionData)
          const interactionDataDedup = interactionData.map(deduplicateInteractionDCIDs);
          const interaction_dcids_dedup = interactionDataDedup.flat(1);

          console.log('interaction_dcids', interaction_dcids_dedup)
          this.fetchScoreData(interaction_dcids_dedup).then(scoreResp => {
            console.log('scores', scoreResp)

            const scoreData = responseToValues(scoreResp);
            console.log('scoreData', scoreData);
            const scores = scoreData.flat(1).map(({dcid}) => dcid)
                                    .filter(dcid => dcid.includes("IntactMiScore"))
                                    .map((dcid) => Number(dcid.split("IntactMiScore").slice(-1)[0]))
            console.log('scores2', scores);
            // doubles as an O(1) retrieval store for whether two proteins interact
            const scoreObj = symmetrizeScores(interaction_dcids_dedup, scores);
            console.log('scoreobj', scoreObj);

            const interactionDataSorted = interactionDataDedup.map(dcidArray => dcidArray
              .filter((interactionDCID, index) => {
                const proteins = proteinsFromInteractionDCID(interactionDCID)
                const parent = nodeDCIDs[index];
                const child = proteins.filter(protein => protein !== parent)[0];
                return !proteinSet.has(`bio/${child}`) && scoreFromInteraction(scoreObj, interactionDCID) >= PPI_CONFIDENCE_SCORE_THRESHOLD;
              })
              .sort((a, b) => scoreFromInteraction(scoreObj, a) - scoreFromInteraction(scoreObj, b)))

            // todo: add above to state for when user changes MAX_INTERACTIONS
            
            const interactionDataTruncated = interactionDataDedup.map(dcidArray => dcidArray.slice(0, MAX_INTERACTIONS))
            console.log(interactionDataTruncated);

            //TODO: 2 magic number
            const newLinks = zip(nodeDCIDs, interactionDataSorted).map(([source, interactions]) => interactions.map(
              (interactionDCID) => {
                const interactionID = interactionDCID.replace("bio/", "")
                const sourceID = source.replace("bio/", "");
                // note this also works in the case of a self-interaction
                const targetID = interactionID.replace(`${sourceID}_`, "").replace(`_${sourceID}`, "");
                return {
                  source: sourceID,
                  target: targetID,
                  score: scoreObj[interactionID],
                }
              }
            )).flat(1);

            const newNodeIDs = new Set(
              newLinks.map(({target}) => target)
            )
            const newNodes = Array.from(newNodeIDs).map(id => nodeFromID((id as string), 2)) // TODO: get rid of assertion here

            console.log('newnodes', newNodes);
            console.log('newlinks', newLinks);

            graphData.nodeData.push(...newNodes);
            graphData.linkData.push(...newLinks);

            this.setState({
              data: resp.data,
              interactionDataDepth1: interactionDataDepth1,
              interactionData: graphData,
            });
          })
        }
      )
    })
  }

}