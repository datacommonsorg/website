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
 * Protein-protein interaction table
 */

import React from "react";
import { Column, useTable } from "react-table";
import { Table } from "reactstrap";

import { InteractionLink } from "./types";

interface Props {
  data: InteractionLink[];
}

// column header info
export const COLUMNS = [
  {
    Header: "Source",
    accessor: "source",
  },
  {
    Header: "Target",
    accessor: "target",
  },
  {
    Header: "Confidence",
    accessor: "score",
  },
];

/**
 * Draw table view of protein-protein interaction graph
 * Reference: https://blog.logrocket.com/complete-guide-building-smart-data-table-react/
 */
export function ProteinProteinInteractionTable({ data }: Props): JSX.Element {
  // Use the useTable Hook to send the columns and data to build the table
  const {
    getTableProps, // table props from react-table
    getTableBodyProps, // table body props from react-table
    headerGroups, // headerGroups, if your table has groupings
    rows, // rows for the table based on the data passed
    prepareRow, // Prepare the row (this function needs to be called for each row before getting the row props)
  } = useTable({
    columns: COLUMNS,
    data,
  } as { columns: Column<InteractionLink>[]; data: InteractionLink[] });

  return (
    <div className="protein-interaction-table">
      <Table hover {...getTableProps()}>
        {/* parse keys out of props to pacify react-eslint
        Reference: https://github.com/TanStack/table/discussions/2647#discussioncomment-1026761 */}
        <thead>
          {headerGroups.map((headerGroup) => {
            const { key, ...restHeaderGroupProps } =
              headerGroup.getHeaderGroupProps();
            return (
              <tr key={key} {...restHeaderGroupProps}>
                {headerGroup.headers.map((column) => {
                  const { key, ...restColumn } = column.getHeaderProps();
                  return (
                    <th key={key} {...restColumn}>
                      {column.render("Header")}
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody {...getTableBodyProps}>
          {rows.map((row) => {
            prepareRow(row);
            const { key, ...restRowProps } = row.getRowProps();
            return (
              <tr key={key} {...restRowProps}>
                {row.cells.map((cell) => {
                  const { key, ...restCellProps } = cell.getCellProps();
                  return (
                    <td key={key} {...restCellProps}>
                      {cell.render("Cell")}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
