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

import { DcCallInfo, DcCalls, Query } from "./types";
import { getAnswerFromQueryAndAnswerSheet, processTableText } from "./util";

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

// Get all table ids present in the answer of a query
function getTablesInAnswer(
  doc: GoogleSpreadsheet,
  query: Query
): Promise<Set<string>> {
  return getAnswerFromQueryAndAnswerSheet(doc, query).then((answer) => {
    // Assume tables are all referenced with the form [Table <id>]
    const matches = answer.match(/\[Table\s(\d+)\]/g);
    const tables = new Set<string>();
    if (matches) {
      Array.from(matches).forEach((match) => {
        const id = match.match(/\d+/)[0];
        tables.add(id);
      });
    }
    return tables;
  });
}

interface TablePanePropType {
  // All the DC calls we want to show tables for
  calls: DcCalls;
  // Only display tables that are present in the answer of the query
  onlyShowAnswerTables?: boolean;
  // Query that we are showing tables for
  query?: Query;
  // Google spreadsheet we are showing tables from
  doc?: GoogleSpreadsheet;
}

export function TablePane(props: TablePanePropType): JSX.Element {
  const [tables, setTables] = useState<TableInfo[]>([]);

  useEffect(() => {
    if (_.isEmpty(props.calls)) {
      setTables([]);
      return;
    }

    // Set of all table ids we want to display
    const allowedTableIdsPromise = props.onlyShowAnswerTables
      ? getTablesInAnswer(props.doc, props.query)
      : Promise.resolve(new Set(Object.keys(props.calls)));

    allowedTableIdsPromise.then((allowedIds) => {
      const tableIds = Object.keys(props.calls).sort(
        (a, b) => Number(a) - Number(b)
      );
      const tableList = [];
      tableIds.forEach((tableId) => {
        if (!allowedIds.has(tableId)) {
          return;
        }
        const tableInfo: DcCallInfo | null = props.calls[tableId];

        if (tableInfo) {
          tableList.push({
            content: tableInfo.dcStat,
            id: tableId,
            title: tableInfo.dcResponse,
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
