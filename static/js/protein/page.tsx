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
import React from "react";

import { GraphNodes } from "../shared/types";
import { drawTissueScoreChart } from "./chart";
import { drawProteinInteractionChart } from "./chart";
import { drawDiseaseGeneAssocChart } from "./chart";
import { drawVarGeneAssocChart } from "./chart";
import { drawVarTypeAssocChart } from "./chart";
import { drawVarSigAssocChart } from "./chart";
import { drawChemGeneAssocChart } from "./chart";
import {
  getChemicalGeneAssoc,
  getDiseaseGeneAssoc,
  getProteinInteraction,
  getTissueScore,
  getVarGeneAssoc,
  getVarSigAssoc,
  getVarTypeAssoc,
} from "./data_processing_utils";

interface PagePropType {
  dcid: string;
  nodeName: string;
}

interface PageStateType {
  data: GraphNodes;
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
    const tissueScore = getTissueScore(this.state.data);
    const interactionScore = getProteinInteraction(
      this.state.data,
      this.props.nodeName
    );
    const diseaseGeneAssoc = getDiseaseGeneAssoc(this.state.data);
    const varGeneAssoc = getVarGeneAssoc(this.state.data);
    const varTypeAssoc = getVarTypeAssoc(this.state.data);
    const varSigAssoc = getVarSigAssoc(this.state.data);
    const chemGeneAssoc = getChemicalGeneAssoc(this.state.data);
    drawTissueScoreChart("tissue-score-chart", tissueScore);
    drawProteinInteractionChart(
      "protein-confidence-score-chart",
      interactionScore
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
    return (
      <>
        <h2>{this.props.nodeName}</h2>
        <h6>Protein Tissue Association</h6>
        <div id="tissue-score-chart"></div>
        <h6>Protein Protein Interaction</h6>
        <div id="protein-confidence-score-chart"></div>
        <h6>Disease Gene Association</h6>
        <div id="disease-gene-association-chart"></div>
        <h6>Variant Gene Association</h6>
        <div id="variant-gene-association-chart"></div>
        <h6>Variant Type Association</h6>
        <div id="variant-type-association-chart"></div>
        <h6>Variant Gene Significance Association</h6>
        <div id="variant-significance-association-chart"></div>
        <h6>Chemical Gene Association</h6>
        <div id="chemical-gene-association-chart"></div>
      </>
    );
  }

  private fetchData(): void {
    axios.get("/api/protein/" + this.props.dcid).then((resp) => {
      this.setState({
        data: resp.data,
      });
    });
  }
}
