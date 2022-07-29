import React from "react";

import { GRAPH_BROWSER_REDIRECT } from "../bio_charts_utils";
import { CompoundDiseaseTreatmentData } from "./chart";

export interface DrugTableProps {
  data: CompoundDiseaseTreatmentData[];
}

export function DrugTable(props: DrugTableProps): JSX.Element {
  // takes the top 10 chemical compound disease associations for greater than 10 values
  const drugTableData = props.data.slice(0, 10);
  // sorts the array based on FDA clinical phase number
  drugTableData.sort((a, b) => b.clinicalPhaseNumber - a.clinicalPhaseNumber);
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
        {drugTableData.map((item, idx) => {
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
