/**
 * Copyright 2024 Google LLC
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

/* Component to display a table */

import { GoogleSpreadsheet } from "google-spreadsheet";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import Collapsible from "react-collapsible";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { DC_CALL_SHEET, DC_RESPONSE_COL, DC_STAT_COL } from "./constants";
import { getSheetsRows } from "./data_store";
import { DcCall } from "./types";
import { processTableText } from "./util";

interface TableInfo {
  id: number;
  title: string;
  content: string;
}

function getTableTrigger(tableInfo: TableInfo, opened: boolean): JSX.Element {
  return (
    <div className="table-title">
      <span className="material-icons-outlined">
        {opened ? "arrow_drop_down" : "arrow_right"}
      </span>
      <span>
        Table {tableInfo.id} &#183; {tableInfo.title}
      </span>
    </div>
  );
}

interface TablePanePropType {
  doc: GoogleSpreadsheet;
  calls: DcCall;
}

export function TablePane(props: TablePanePropType): JSX.Element {
  const [tables, setTables] = useState<TableInfo[]>([]);

  useEffect(() => {
    if (_.isEmpty(props.calls)) {
      setTables([]);
      return;
    }
    const sheet = props.doc.sheetsByTitle[DC_CALL_SHEET];
    const tableIds = Object.keys(props.calls).sort(
      (a, b) => Number(a) - Number(b)
    );
    const rowIdxList = tableIds.map((tableId) => props.calls[tableId]);
    getSheetsRows(sheet, rowIdxList).then((rows) => {
      const tableList = [];
      tableIds.forEach((tableId) => {
        const rowIdx = props.calls[tableId];
        const row = rows[rowIdx];
        if (row) {
          tableList.push({
            id: tableId,
            title: row.get(DC_RESPONSE_COL),
            content: row.get(DC_STAT_COL),
          });
        }
      });
      setTables(tableList);
    });
  }, [props]);

  // We only want to show tables that actually have content
  const filteredTables = tables.filter((tableInfo) => !!tableInfo.content);

  if (_.isEmpty(filteredTables)) {
    return null;
  }

  return (
    <div className="table-pane">
      {filteredTables.map((tableInfo) => {
        return (
          <Collapsible
            key={tableInfo.id}
            trigger={getTableTrigger(tableInfo, false)}
            triggerWhenOpen={getTableTrigger(tableInfo, true)}
          >
            <div className="table-content">
              <ReactMarkdown
                rehypePlugins={[rehypeRaw as any]}
                remarkPlugins={[remarkGfm]}
              >
                {processTableText(tableInfo.content)}
              </ReactMarkdown>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
