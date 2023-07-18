/**
 * Copyright 2023 Google LLC
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
import _ from "lodash";
import React from "react";
import { UncontrolledTooltip } from "reactstrap";

interface SidebarPropsType {
  queries: string[];
  onQueryItemClick: (queries: string[]) => void;
}

/**
 * NL sidebar showing query history
 */
export function Sidebar(props: SidebarPropsType) {
  const { queries, onQueryItemClick } = props;
  const uniqueQueries = _.uniq(queries).reverse();
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <a href="/nl" className="context-link">
          <span className="material-icons">add_icon</span>
          <span className="context-link-text">New Context</span>
        </a>
      </div>
      <div className="sidebar-recent">
        {uniqueQueries.length > 0 ? (
          <>
            <h5>Recent</h5>
            <ul>
              {uniqueQueries.map((query, i) => (
                <li key={i} id={`sidebar-recent-query-item-${i}`}>
                  <a
                    href=""
                    onClick={(e) => {
                      e.preventDefault();
                      onQueryItemClick([query]);
                    }}
                    title={query}
                  >
                    <span className="material-icons">
                      chat_bubble_outline_icon
                    </span>
                    <span className="text">{query}</span>
                  </a>
                  <UncontrolledTooltip
                    boundariesElement="window"
                    delay={400}
                    placement="right"
                    target={`sidebar-recent-query-item-${i}`}
                  >
                    {query}
                  </UncontrolledTooltip>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <div className="sidebar-footer">
        Powered by{" "}
        <a
          href="https://datacommons.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          datacommons.org
        </a>
      </div>
    </div>
  );
}
