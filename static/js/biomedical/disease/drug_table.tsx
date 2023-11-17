import React from "react";

import { GRAPH_BROWSER_REDIRECT } from "../bio_charts_utils";
import {
  CompoundDiseaseContraindicationData,
  CompoundDiseaseTreatmentData,
  DrugTreatmentTableColumn,
} from "./types";

export interface DrugTreatmentTableProps {
  // stores the column id and column name
  // retains the order of the columns and column ids should match the keys of the objects in the data array
  columns: DrugTreatmentTableColumn[];
  // the data is either of type CompoundDiseaseContraindicationData or CompoundDiseaseTreatmentData
  data: CompoundDiseaseContraindicationData[] | CompoundDiseaseTreatmentData[];
}

export function DrugTreatmentTable(
  props: DrugTreatmentTableProps
): JSX.Element {
  // takes the top 10 chemical compound disease associations for greater than 10 values
  const drugTreatmentTableData = props.data.slice(0, 10);
  return (
    <table>
      <thead>
        <tr>
          {props.columns.map((column) => {
            return <td key={column.id}>{column.name}</td>;
          })}
        </tr>
      </thead>
      <tbody>
        {drugTreatmentTableData.map((item, idx) => {
          return (
            <tr key={idx}>
              {props.columns.map((column) => {
                const element = item[column.id] || "";
                // if column id is node, then display a hyperlinked table element
                if (column.id === "node") {
                  return (
                    <td>
                      <a href={GRAPH_BROWSER_REDIRECT + element}>Node</a>
                    </td>
                  );
                } else {
                  return <td>{element}</td>;
                }
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
