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
 * A component to display a category of the knowledge graph
 */

import React, { ReactElement } from "react";

import { KnowledgeGraph } from "../../../shared/types/knowledge_graph";

interface KnowledgeGraphBrowserProps {
  //an object containing the categorized links that make up the knowledge graph
  knowledgeGraph: KnowledgeGraph;
}

export const KnowledgeGraphBrowser = ({
  knowledgeGraph,
}: KnowledgeGraphBrowserProps): ReactElement => {
  return (
    <section id="browser-items" className="browser-items">
      <div className="container">
        {knowledgeGraph.map((category) => (
          <article key={category.title} className="item">
            <header className="header">
              <h3>{category.title}</h3>
            </header>
            <ul>
              {category.items.map((item) => (
                <li key={item.endpoint}>
                  <a href={`/browser/${item.endpoint}`}>{item.label}</a>
                </li>
              ))}
              {category.categoryEndpoint && (
                <li>
                  <a
                    href={`/browser/${category.categoryEndpoint}`}
                    className="more"
                  >
                    <span className="text">& more to search from</span>
                  </a>
                </li>
              )}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};
