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
import React, { useEffect, useState } from "react";
import Collapsible from "react-collapsible";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { DcCallInfo, DcCalls } from "./types";
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
  calls: DcCalls;
}

export function TablePane(props: TablePanePropType): JSX.Element {
  const [tables, setTables] = useState<TableInfo[]>([]);

  useEffect(() => {
    if (_.isEmpty(props.calls)) {
      setTables([]);
      return;
    }
    const tableIds = Object.keys(props.calls).sort(
      (a, b) => Number(a) - Number(b)
    );
    const tableList = [];
    tableIds.forEach((tableId) => {
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
