import React from "react";

import { GRAPH_BROWSER_REDIRECT } from "../bio_charts_utils";
import {
  CompoundDiseaseContraindicationData,
  CompoundDiseaseTreatmentData,
} from "./chart";

export interface DrugTableColumnType {
  id: string;
  name: string;
}
export interface DrugTableProps {
  columns: DrugTableColumnType[];
  data: Record<never, never>[];
}
export function DrugTreatmentTable(props: DrugTableProps): JSX.Element {
  // takes the top 10 chemical compound disease associations for greater than 10 values
  const drugTreatmentTableData = props.data.slice(0, 10);
  // take the drug treatment table columns
  const drugTreatmentColumns = props.columns;
  const nameArray = drugTreatmentColumns.map(function (el) {
    return el.name;
  });
  return (
    <table>
      <thead>
        <tr>
          <td>{nameArray[0]}</td>
          <td>{nameArray[1]}</td>
          <td>{nameArray[2]}</td>
          <td>{nameArray[3]}</td>
        </tr>
      </thead>
      <tbody>
        {drugTreatmentTableData.map((item, idx) => {
          const items = Object.entries(item);
          return (
            <tr key={idx}>
              <td>
                <a href={GRAPH_BROWSER_REDIRECT + items[0][1]}>Node</a>
              </td>
              <td>{items[1][1]}</td>
              <td>{items[2][1]}</td>
              <td>{items[3][1]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
