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

import _ from "lodash";
import React, { useContext, useEffect, useState } from "react";
import Collapsible from "react-collapsible";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { DC_CALL_SHEET, DC_RESPONSE_COL, DC_STAT_COL } from "./constants";
import { AppContext, SessionContext } from "./context";
import { getSheetsRows } from "./data_store";
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

export function TablePane(): JSX.Element {
  const { allCall, doc } = useContext(AppContext);
  const { sessionQueryId } = useContext(SessionContext);
  const [tables, setTables] = useState<TableInfo[]>([]);

  useEffect(() => {
    if (_.isEmpty(allCall[sessionQueryId])) {
      setTables([]);
      return;
    }
    const sheet = doc.sheetsByTitle[DC_CALL_SHEET];
    const tableIds = Object.keys(allCall[sessionQueryId]).sort(
      (a, b) => Number(a) - Number(b)
    );
    const rowIdxList = tableIds.map(
      (tableId) => allCall[sessionQueryId][tableId]
    );
    getSheetsRows(sheet, rowIdxList).then((rows) => {
      const tableList = [];
      tableIds.forEach((tableId) => {
        const rowIdx = allCall[sessionQueryId][tableId];
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
  }, [allCall, doc, sessionQueryId]);

  if (_.isEmpty(tables)) {
    return null;
  }

  return (
    <div className="table-pane">
      {tables.map((tableInfo) => {
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
