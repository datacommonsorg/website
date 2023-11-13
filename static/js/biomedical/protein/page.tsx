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

/**
 * Main component for bio.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { GraphNodes } from "../../shared/types";
import { getEntityLink } from "../bio_charts_utils";
import {
  drawChemGeneAssocChart,
  drawDiseaseGeneAssocChart,
  drawProteinInteractionChart,
  drawTissueLegend,
  drawTissueScoreChart,
  drawVarGeneAssocChart,
  drawVarSigAssocChart,
  drawVarTypeAssocChart,
  ProteinNumData,
  ProteinStrData,
} from "./chart";
import {
  getChemicalGeneAssoc,
  getDiseaseGeneAssoc,
  getProteinDescription,
  getProteinInteraction,
  getTissueScore,
  getVarGeneAssoc,
  getVarSigAssoc,
  getVarTypeAssoc,
} from "./data_processing_utils";
import { ProteinProteinInteractionGraph } from "./protein_protein_interaction_graph";
import { BioDcid } from "./types";

export interface PagePropType {
  dcid: string;
  nodeName: string;
}

export interface PageStateType {
  data: GraphNodes;
  tissueScore: ProteinStrData[];
  interactionScore: InteractingProteinType[];
  diseaseGeneAssoc: DiseaseAssociationType[];
  varGeneAssoc: ProteinVarType[];
  varTypeAssoc: ProteinNumData[];
  varSigAssoc: ProteinNumData[];
  chemGeneAssoc: ProteinNumData[];
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

export class Page extends React.Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.state = {
      data: null,
      tissueScore: null,
      interactionScore: null,
      diseaseGeneAssoc: null,
      varGeneAssoc: null,
      varTypeAssoc: null,
      varSigAssoc: null,
      chemGeneAssoc: null,
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(): void {
    drawTissueScoreChart("tissue-score-chart", this.state.tissueScore);
    drawTissueLegend("tissue-score-legend", this.state.tissueScore);
    drawProteinInteractionChart(
      "protein-confidence-score-chart",
      this.state.interactionScore
    );
    // drawProteinInteractionGraph("protein-interaction-graph", interactionScore);
    drawDiseaseGeneAssocChart(
      "disease-gene-association-chart",
      this.state.diseaseGeneAssoc
    );
    drawVarGeneAssocChart(
      "variant-gene-association-chart",
      this.state.varGeneAssoc
    );
    drawVarTypeAssocChart(
      "variant-type-association-chart",
      this.state.varTypeAssoc
    );
    drawVarSigAssocChart(
      "variant-significance-association-chart",
      this.state.varSigAssoc
    );
    drawChemGeneAssocChart(
      "chemical-gene-association-chart",
      this.state.chemGeneAssoc
    );
  }

  render(): JSX.Element {
    /* this.props.nodeName is formatted as ProteinName_SpeciesName
    Using the split we get the ProteinName and SpeciesName separately
    */
    const splitNodeName = this.props.nodeName.split("_");
    const proteinLink = getEntityLink(this.props.dcid);
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
        {!_.isEmpty(this.state.tissueScore) && (
          <>
            <h5>Protein Tissue Expression</h5>
            <p>
              {splitNodeName[0]} expression level (none, low, medium, or high)
              detected in each tissue as reported by The Human Protein Atlas.
              The color of the bar indicates the organ from which the tissue
              derives (legend bottom panel).
            </p>
            <div id="tissue-score-chart"></div>
            <div id="tissue-score-legend"></div>
          </>
        )}
        {!_.isEmpty(this.state.interactionScore) && (
          <>
            <h5>Protein Protein Interaction</h5>
            <>
              <p>
                The interaction score of {splitNodeName[0]} with other proteins
                as reported by The Molecular INTeraction Database (MINT). The
                top 10 associations by interaction score are displayed.
              </p>
              <div id="protein-confidence-score-chart"></div>
              <ProteinProteinInteractionGraph
                centerProteinDcid={this.props.dcid as BioDcid}
              ></ProteinProteinInteractionGraph>
            </>
          </>
        )}
        {!_.isEmpty(this.state.diseaseGeneAssoc) && (
          <>
            <h5>Disease Gene Association</h5>
            <p>
              The association score of {splitNodeName[0]} with diseases as
              reported by DISEASES by Jensen Lab. Associations were determined
              by text mining of the literature. The top 10 associations by
              association score are displayed.
            </p>
            <div id="disease-gene-association-chart"></div>
          </>
        )}
        {!_.isEmpty(this.state.varGeneAssoc) && (
          <>
            <h5>Variant Gene Association</h5>
            <p>
              Genetic variants that are associated with expression level of{" "}
              {splitNodeName[0]} in a specific tissue in humans (legend top
              right panel) as reported by the Genotype Expression (GTEx)
              project.
            </p>
            <div id="variant-gene-association-chart"></div>
          </>
        )}
        {!_.isEmpty(this.state.varTypeAssoc) && (
          <>
            <h5>Variant Type Association</h5>
            <>
              <p>
                The count of genetic variants by functional category as reported
                by NCBI dbSNP, which are associated with regulation of{" "}
                {splitNodeName[0]} expression by the Genotype Expression (GTEx)
                project.
              </p>
              <div id="variant-type-association-chart"></div>
            </>
          </>
        )}
        {!_.isEmpty(this.state.varTypeAssoc) && (
          <>
            <h5>Variant Gene Significance Association</h5>
            <>
              <p>
                The count of genetic variants by clinical significance as
                reported by NCBI ClinVar, which are associated with regulation
                of {splitNodeName[0]} expression by the Genotype Expression
                (GTEx) project.
              </p>
              <div id="variant-significance-association-chart"></div>
            </>
          </>
        )}
        {!_.isEmpty(this.state.chemGeneAssoc) && (
          <>
            <h5>Drug Gene Association</h5>
            <>
              <p>
                The number of drugs that are associated, ambiguously associated,
                or not associated with regulation of {splitNodeName[0]} as
                reported by pharmGKB.
              </p>
              <div id="chemical-gene-association-chart"></div>
            </>
          </>
        )}
      </>
    );
  }

  private fetchData(): void {
    axios.get("/api/protein/" + this.props.dcid).then((resp) => {
      this.setState({
        data: resp.data,
        tissueScore: getTissueScore(resp.data),
        interactionScore: getProteinInteraction(resp.data, this.props.nodeName),
        diseaseGeneAssoc: getDiseaseGeneAssoc(resp.data),
        varGeneAssoc: getVarGeneAssoc(resp.data),
        varTypeAssoc: getVarTypeAssoc(resp.data),
        varSigAssoc: getVarSigAssoc(resp.data),
        chemGeneAssoc: getChemicalGeneAssoc(resp.data),
      });
    });
  }
}
