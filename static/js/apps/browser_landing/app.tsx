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
 * Main component for the browser landing (knowledge graph) page
 */

import React, { ReactElement } from "react";

import { IntroText } from "../../components/content/intro_text";
import { KnowledgeGraphCategory } from "../../shared/types/knowledge_graph";
import { KnowledgeGraphBrowser } from "./components/knowledge_graph_browser";
import knowledgeGraphData from "./knowledge_graph.json";

const knowledgeGraph: KnowledgeGraphCategory[] = knowledgeGraphData;

/**
 * Application container
 */
export function App(): ReactElement {
  return (
    <>
      <IntroText>
        <header>
          <h1 id="kg-title">Knowledge Graph</h1>
          <p id="kg-desc">
            The Data Commons Knowledge Graph is constructed by synthesizing a
            single database from many different data sources. This knowledge
            graph can be used both to explore what data is available and to
            understand the graph structure.
          </p>
        </header>
      </IntroText>
      <KnowledgeGraphBrowser knowledgeGraph={knowledgeGraph} />
    </>
  );
}
