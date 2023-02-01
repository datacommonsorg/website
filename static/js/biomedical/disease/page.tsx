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

import { MapTile } from "../../components/tiles/map_tile";
import { USA_NAMED_TYPED_PLACE } from "../../shared/constants";
import { GraphNodes } from "../../shared/types";
import { getEntityLink } from "../bio_charts_utils";
import {
  drawDiseaseGeneAssocChart,
  drawDiseaseSymptomAssociationChart,
} from "./chart";
import {
  getCompoundDiseaseContraindication,
  getCompoundDiseaseTreatment,
  getDiseaseCommonName,
  getDiseaseGeneAssociation,
  getDiseasePrevalenceID,
  getDiseaseSymptomAssociation,
} from "./data_processing_utils";
import { DrugTreatmentTable } from "./drug_table";
import {
  CompoundDiseaseContraindicationData,
  CompoundDiseaseTreatmentData,
  DiseaseGeneAssociationData,
  DiseaseSymptomAssociationData,
} from "./types";

export interface PagePropType {
  dcid: string;
  nodeName: string;
}

// fields for each of the charts, ex:
export interface PageStateType {
  data: GraphNodes;
  diseaseGeneAssociation: DiseaseGeneAssociationData[];
  diseaseSymptomAssociation: DiseaseSymptomAssociationData[];
  chemicalCompoundDiseaseTreatment: CompoundDiseaseTreatmentData[];
  chemicalCompoundDiseaseContraindication: CompoundDiseaseContraindicationData[];
}

export class Page extends React.Component<PagePropType, PageStateType> {
  constructor(props: PagePropType) {
    super(props);
    this.state = {
      data: null,
      diseaseGeneAssociation: null,
      diseaseSymptomAssociation: null,
      chemicalCompoundDiseaseTreatment: null,
      chemicalCompoundDiseaseContraindication: null,
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  componentDidUpdate(): void {
    drawDiseaseGeneAssocChart(
      "disease-gene-association-chart",
      this.state.diseaseGeneAssociation
    );
    drawDiseaseSymptomAssociationChart(
      "disease-symptom-association-chart",
      this.state.diseaseSymptomAssociation
    );
  }
  render(): JSX.Element {
    const diseaseName = getDiseaseCommonName(this.state.data);
    const diseaseLink = getEntityLink(this.props.dcid);
    const diseaseTreatmentColumns = [
      { id: "node", name: "Parent Node" },
      { id: "id", name: "Compound ID" },
      { id: "name", name: "Compound Name" },
      { id: "clinicalPhaseNumber", name: "FDA Clinical Phase" },
    ];
    const diseaseContraindicationColumns = [
      { id: "node", name: "Parent Node" },
      { id: "id", name: "Compound ID" },
      { id: "name", name: "Compound Name" },
      { id: "drugSource", name: "Drug Source" },
    ];
    const diseasePrevalenceStatVarDcid =
      "Count_MedicalConditionIncident_Condition" + this.props.dcid;
    const statVarDisease = {
      statVar: diseasePrevalenceStatVarDcid,
      denom: "Count_Person",
      unit: "%",
      scaling: 100,
      log: false,
      name: "diseaseData",
    };
    // Render the graphs only when the data is not null
    if (this.state.data === null) {
      return null;
    }
    return (
      <>
        <h2>{diseaseName}</h2>
        <h6>
          <a href={diseaseLink}>Graph Browser View</a>
        </h6>
        {!_.isEmpty(this.state.diseaseGeneAssociation) && (
          <>
            <h5>Disease-Gene Association</h5>
            <p>
              The association score of {diseaseName} with genes as reported by
              DISEASES by Jensen Lab. Associations were determined by text
              mining of the literature. 10 associations for the disease of
              interest are displayed.
            </p>
            <div id="disease-gene-association-chart"></div>
          </>
        )}
        {!_.isEmpty(this.state.diseaseSymptomAssociation) && (
          <>
            <h5>Disease-Symptom Association</h5>
            <p>
              The association score of {diseaseName} with symptoms as reported
              by SPOKE by UCSF. Associations were determined by interactions of
              biomedical entities in a graph-theoretic database. The top 10
              symptom associations are displayed for the disease of interest.
            </p>
            <div id="disease-symptom-association-chart"></div>
          </>
        )}
        <br></br>
        {!_.isEmpty(this.state.chemicalCompoundDiseaseTreatment) && (
          <>
            <h5>Chemical Compound Disease Treatment</h5>
            <p>
              The chemical compounds associated with the treatment of{" "}
              {diseaseName} as reported by the ChEMBL database. The compounds
              are arranged in decreasing order of the FDA clinical phase number.
            </p>
            <br></br>
            <div>
              <div id="table"></div>
              <DrugTreatmentTable
                columns={diseaseTreatmentColumns}
                data={this.state.chemicalCompoundDiseaseTreatment}
              />
            </div>
          </>
        )}
        <br></br>
        {!_.isEmpty(this.state.chemicalCompoundDiseaseContraindication) && (
          <>
            <h5>Chemical Compound Disease Contraindication</h5>
            <p>
              The chemical compounds contraindicated with {diseaseName} as
              reported by the ChEMBL database.
            </p>
            <br></br>
            <div>
              <div id="table"></div>
              <DrugTreatmentTable
                columns={diseaseContraindicationColumns}
                data={this.state.chemicalCompoundDiseaseContraindication}
              />
            </div>
          </>
        )}
        <div>
          {getDiseasePrevalenceID(this.state.data) && (
            <>
              <h5>Disease Prevalance Data</h5>
              <p>
                The U.S.state-wise prevalence rates of {diseaseName} as reported
                by the Centers for Disease Control and Prevention (CDC).
              </p>
              <br></br>
              <div id={diseasePrevalenceStatVarDcid}></div>
              <MapTile
                id={diseasePrevalenceStatVarDcid}
                title={"(${date})"}
                place={USA_NAMED_TYPED_PLACE}
                enclosedPlaceType={"State"}
                statVarSpec={statVarDisease}
                svgChartHeight={200}
              />
            </>
          )}
        </div>
      </>
    );
  }
  private fetchData(): void {
    axios.get("/api/disease/" + this.props.dcid).then((resp) => {
      this.setState({
        data: resp.data,
        diseaseGeneAssociation: getDiseaseGeneAssociation(resp.data),
        diseaseSymptomAssociation: getDiseaseSymptomAssociation(resp.data),
        chemicalCompoundDiseaseTreatment: getCompoundDiseaseTreatment(
          resp.data
        ),
        chemicalCompoundDiseaseContraindication:
          getCompoundDiseaseContraindication(resp.data),
      });
    });
  }
}
