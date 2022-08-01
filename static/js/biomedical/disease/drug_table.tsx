import React from "react";

import { GRAPH_BROWSER_REDIRECT } from "../bio_charts_utils";
import {
  CompoundDiseaseContraindicationData,
  CompoundDiseaseTreatmentData,
} from "./chart";

export interface CompoundDiseaseTreatmentProps {
  data: CompoundDiseaseTreatmentData[];
}

export interface CompoundDiseaseContraindicationProps {
  data: CompoundDiseaseContraindicationData[];
}

export function CompoundDiseaseTreatmentTable(
  props: CompoundDiseaseTreatmentProps
): JSX.Element {
  // takes the top 10 chemical compound disease associations for greater than 10 values
  const compoundDiseaseTreatmentTableData = props.data.slice(0, 10);
  // sorts the array based on FDA clinical phase number
  compoundDiseaseTreatmentTableData.sort(
    (a, b) => b.clinicalPhaseNumber - a.clinicalPhaseNumber
  );
  return (
    <table>
      <thead>
        <tr>
          <td>Parent Node</td>
          <td>Compound ID</td>
          <td>Compound Name</td>
          <td>FDA Clinical Phase</td>
        </tr>
      </thead>
      <tbody>
        {compoundDiseaseTreatmentTableData.map((item, idx) => {
          return (
            <tr key={idx}>
              <td>
                <a href={GRAPH_BROWSER_REDIRECT + item.node}>Node</a>
              </td>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.clinicalPhaseNumber}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function CompoundDiseaseContraindicationTable(
  props: CompoundDiseaseContraindicationProps
): JSX.Element {
  // takes the top 10 chemical compound disease contraindications for greater than 10 values
  const compoundDiseaseContraindicationTableData = props.data.slice(0, 10);
  // sorts the array alphabetically based on drug source name
  compoundDiseaseContraindicationTableData.sort((a, b) =>
    a.drugSource > b.drugSource ? 1 : -1
  );
  return (
    <table>
      <thead>
        <tr>
          <td>Parent Node</td>
          <td>Compound ID</td>
          <td>Compound Name</td>
          <td>Drug Central Source</td>
        </tr>
      </thead>
      <tbody>
        {compoundDiseaseContraindicationTableData.map((item, idx) => {
          return (
            <tr key={idx}>
              <td>
                <a href={GRAPH_BROWSER_REDIRECT + item.node}>Node</a>
              </td>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.drugSource}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
