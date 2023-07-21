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
import React from "react";
import { UncontrolledTooltip } from "reactstrap";

import { useStoreActions, useStoreState } from "./app_state";

/**
 * NL sidebar showing query history
 */
export function Sidebar(): JSX.Element {
  const updateConfig = useStoreActions((a) => a.updateConfig);
  const currentNlQueryContextId = useStoreState(
    (s) => s.config.currentNlQueryContextId
  );
  const nlQueryContexts = useStoreState((s) =>
    s.nlQueryContextIds.map((id) => s.nlQueryContexts[id])
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <a
          href="/nl"
          className={`context-link ${
            !currentNlQueryContextId ? "disabled" : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            if (!currentNlQueryContextId) {
              return;
            }
            updateConfig({
              currentNlQueryContextId: null,
            });
          }}
        >
          <span className="material-icons">add_icon</span>
          <span className="context-link-text">New Context</span>
        </a>
      </div>
      <div className="sidebar-recent">
        {nlQueryContexts.length > 0 ? (
          <>
            <h5>Recent</h5>
            <ul>
              {nlQueryContexts.reverse().map((nlQueryContext, i) => (
                <li key={i} id={`sidebar-recent-query-context-${i}`}>
                  <a
                    href=""
                    onClick={(e) => {
                      e.preventDefault();
                      updateConfig({
                        currentNlQueryContextId: nlQueryContext.id,
                      });
                    }}
                    className={
                      nlQueryContext.id === currentNlQueryContextId
                        ? "selected"
                        : ""
                    }
                    title={nlQueryContext.name}
                  >
                    <span className="material-icons">
                      chat_bubble_outline_icon
                    </span>
                    <span className="text">{nlQueryContext.name}</span>
                  </a>
                  <UncontrolledTooltip
                    boundariesElement="window"
                    delay={400}
                    placement="right"
                    target={`sidebar-recent-query-context-${i}`}
                  >
                    {nlQueryContext.name}
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
