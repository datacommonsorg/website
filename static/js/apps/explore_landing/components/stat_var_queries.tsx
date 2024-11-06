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

/**
 * Component for the stat var queries on the explore landing pages.
 */

import React, { ReactElement } from "react";

import { Query } from "../../../shared/topic_config";

interface StatVarQueriesProps {
  queries: Query[];
}

export function StatVarQueries({ queries }: StatVarQueriesProps): ReactElement {
  if (queries.length === 0) {
    return null;
  }
  return (
    <div className="container stats-block">
      <h3>
        Explore statistical variables around the world in the Timeline explorer
        tool
      </h3>
      <ul className="stats-list">
        {queries.map((query) => (
          <li key={query.url}>
            <a href={query.url}>
              <span className="material-icons-outlined">arrow_forward</span>
              {query.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
