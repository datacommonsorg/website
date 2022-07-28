import React from "react";

import { GRAPH_BROWSER_REDIRECT } from "../bio_charts_utils";
import { CompoundDiseaseTreatmentData } from "./chart";
export interface DrugTableProps {
  data: CompoundDiseaseTreatmentData[];
}
export function DrugTable(props: DrugTableProps): JSX.Element {
  let DrugTableData = props.data;
  // takes the top 10 chemical compound disease associations for greater than 10 values
  if (DrugTableData.length > 10) {
    DrugTableData = DrugTableData.slice(0, 10);
  }
  // sorts the array based on FDA clinical phase number
  DrugTableData = DrugTableData.sort(
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
        {DrugTableData.map((item, idx) => {
          return (
            <tr>
              <td key={idx}>
                <a href={GRAPH_BROWSER_REDIRECT + item.node}>Node</a>
              </td>
              <td key={idx}>{item.id}</td>
              <td key={idx}>{item.name}</td>
              <td key={idx}>{item.clinicalPhaseNumber}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
